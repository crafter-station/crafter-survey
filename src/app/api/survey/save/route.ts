import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getEnvValidationMessage, hasRequiredSurveyEnv } from "@/env";
import {
  checkSurveyRateLimit,
  getRateLimitHeaders,
  getRetryAfterSeconds,
} from "@/lib/ratelimit";
import { getSessionCookieOptions, SESSION_COOKIE_NAME } from "@/lib/session";
import {
  appendSurveyFormSaveEvent,
  ensureSurveyChatState,
} from "@/lib/survey/chat-persistence";
import { getResponseBundle } from "@/lib/survey/load-survey";
import { authorizeResponseAccess } from "@/lib/survey/request-access";
import { saveSurveyProgress } from "@/lib/survey/save-progress";
import {
  serializeSurvey,
  serializeSurveyResponse,
} from "@/lib/survey/serialize";
import {
  assertSectionBelongsToSurvey,
  prepareAnswerChanges,
  SurveyValidationError,
  saveRequestSchema,
} from "@/lib/survey/validation";
import type { SerializedAnswer } from "@/types/survey";

function jsonError(
  message: string,
  status: number,
  extra?: Record<string, unknown>,
) {
  return NextResponse.json({ message, ...extra }, { status });
}

function readAnswerSignature(answer: SerializedAnswer | undefined) {
  if (!answer) {
    return "null";
  }

  return JSON.stringify({
    valueJson: answer.valueJson ?? null,
    valueText: answer.valueText ?? null,
  });
}

function hasPersistedAnswerValue(answer: SerializedAnswer | undefined) {
  if (!answer) {
    return false;
  }

  return Boolean(answer.valueText?.trim()) || answer.valueJson !== null;
}

function getChangedSavedQuestionIds({
  before,
  after,
}: {
  before: Record<string, SerializedAnswer>;
  after: Record<string, SerializedAnswer>;
}) {
  return Object.entries(after)
    .filter(([, answer]) => hasPersistedAnswerValue(answer))
    .filter(
      ([questionId, answer]) =>
        readAnswerSignature(before[questionId]) !== readAnswerSignature(answer),
    )
    .map(([questionId]) => questionId);
}

export async function POST(request: Request) {
  if (!hasRequiredSurveyEnv()) {
    return jsonError(
      getEnvValidationMessage() ??
        "Set DATABASE_URL, SESSION_SECRET, SURVEY_ACCESS_CODE, UPSTASH_REDIS_REST_URL, and UPSTASH_REDIS_REST_TOKEN before using the survey API.",
      503,
    );
  }

  try {
    const parsed = saveRequestSchema.parse(await request.json());
    const cookieHeader = request.headers.get("cookie");
    const sessionToken =
      cookieHeader
        ?.split(";")
        .map((part) => part.trim())
        .find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`))
        ?.split("=")
        .slice(1)
        .join("=") ?? null;

    const rateLimit = await checkSurveyRateLimit({
      route: "save",
      headers: request.headers,
      sessionToken,
      responseId: parsed.responseId,
    });

    if (!rateLimit.success) {
      return NextResponse.json(
        {
          code: "rate_limited",
          message: rateLimit.message,
          retryAfterSeconds: getRetryAfterSeconds(rateLimit),
        },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimit),
        },
      );
    }

    const authorization = await authorizeResponseAccess({
      requestHeaders: request.headers,
      responseId: parsed.responseId,
      sessionToken,
    });

    if (authorization.kind === "missing") {
      return jsonError("Survey response not found.", 404, {
        code: "response_not_found",
      });
    }

    if (authorization.kind === "forbidden") {
      return jsonError(
        "You are not allowed to update this survey response.",
        403,
        { code: "response_forbidden" },
      );
    }

    if (authorization.response.status === "submitted") {
      return jsonError("This survey has already been submitted.", 409, {
        code: "response_submitted",
      });
    }

    const survey = serializeSurvey(authorization.response.surveyVersion);
    const previousAnswers = serializeSurveyResponse(
      authorization.response,
    ).answers;

    assertSectionBelongsToSurvey(survey, parsed.currentSectionId);

    const changes = prepareAnswerChanges(survey, parsed.answers);
    const lastSavedAt = await saveSurveyProgress({
      responseId: authorization.response.id,
      currentSectionId: parsed.currentSectionId,
      changes,
    });

    const updatedResponse = await getResponseBundle(authorization.response.id);

    if (!updatedResponse) {
      throw new Error("Updated survey response not found after save.");
    }

    const updatedAnswers = serializeSurveyResponse(updatedResponse).answers;
    await ensureSurveyChatState({
      responseId: updatedResponse.id,
      survey,
      answers: updatedAnswers,
    });

    const changedSavedQuestionIds = getChangedSavedQuestionIds({
      before: previousAnswers,
      after: updatedAnswers,
    });

    await appendSurveyFormSaveEvent({
      responseId: updatedResponse.id,
      savedQuestionIds: changedSavedQuestionIds,
    });

    const response = NextResponse.json({
      lastSavedAt: lastSavedAt.toISOString(),
      currentSectionId: parsed.currentSectionId,
    });

    if (authorization.sessionTokenToSet) {
      response.cookies.set(
        SESSION_COOKIE_NAME,
        authorization.sessionTokenToSet,
        getSessionCookieOptions(),
      );
    }

    return response;
  } catch (error) {
    if (error instanceof SurveyValidationError || error instanceof ZodError) {
      return jsonError(error.message, 400, { code: "invalid_save_request" });
    }

    return jsonError("Failed to save survey progress.", 500, {
      code: "save_failed",
    });
  }
}
