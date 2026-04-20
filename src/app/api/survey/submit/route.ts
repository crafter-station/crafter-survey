import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getEnvValidationMessage, hasRequiredSurveyEnv } from "@/env";
import {
  checkSurveyRateLimit,
  getRateLimitHeaders,
  getRetryAfterSeconds,
} from "@/lib/ratelimit";
import { getSessionCookieOptions, SESSION_COOKIE_NAME } from "@/lib/session";
import { authorizeResponseAccess } from "@/lib/survey/request-access";
import { serializeSurvey } from "@/lib/survey/serialize";
import { submitSurveyResponse } from "@/lib/survey/submit-response";
import {
  assertSectionBelongsToSurvey,
  prepareAnswerChanges,
  SurveyValidationError,
  submitRequestSchema,
} from "@/lib/survey/validation";

function jsonError(
  message: string,
  status: number,
  extra?: Record<string, unknown>,
) {
  return NextResponse.json({ message, ...extra }, { status });
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
    const parsed = submitRequestSchema.parse(await request.json());
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
      route: "submit",
      headers: request.headers,
      sessionToken,
      responseId: parsed.responseId,
    });

    if (!rateLimit.success) {
      return NextResponse.json(
        {
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
      return jsonError("Survey response not found.", 404);
    }

    if (authorization.kind === "forbidden") {
      return jsonError(
        "You are not allowed to submit this survey response.",
        403,
      );
    }

    if (authorization.response.status === "submitted") {
      return jsonError("This survey has already been submitted.", 409);
    }

    const survey = serializeSurvey(authorization.response.surveyVersion);

    assertSectionBelongsToSurvey(survey, parsed.currentSectionId);

    const changes = prepareAnswerChanges(survey, parsed.answers);
    const result = await submitSurveyResponse({
      responseId: authorization.response.id,
      currentSectionId: parsed.currentSectionId,
      changes,
    });

    const response = NextResponse.json({
      response: result.response,
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
      return jsonError(error.message, 400);
    }

    return jsonError("Failed to submit the survey.", 500);
  }
}
