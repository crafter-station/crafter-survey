import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getDb } from "@/db/client";
import { anonymousSessions, surveyResponses } from "@/db/schema";
import { getEnvValidationMessage, hasRequiredSurveyEnv } from "@/env";
import { createFingerprintHash } from "@/lib/fingerprint";
import {
  checkSurveyRateLimit,
  getRateLimitHeaders,
  getRetryAfterSeconds,
} from "@/lib/ratelimit";
import {
  createAnonymousSessionToken,
  getSessionCookieOptions,
  hashSessionToken,
  SESSION_COOKIE_NAME,
} from "@/lib/session";
import { verifyAccessCode } from "@/lib/survey/access-code";
import { ensureSurveyChatState } from "@/lib/survey/chat-persistence";
import {
  findLatestResponseReferenceByFingerprintHash,
  findLatestResponseReferenceForSession,
  findSessionByCookieToken,
  getActiveSurveyBundle,
  getResponseBundle,
} from "@/lib/survey/load-survey";
import {
  serializeSurvey,
  serializeSurveyResponse,
} from "@/lib/survey/serialize";
import {
  SurveyValidationError,
  unlockRequestSchema,
} from "@/lib/survey/validation";

function jsonError(message: string, status: number) {
  return NextResponse.json({ message }, { status });
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
    const parsed = unlockRequestSchema.parse(await request.json());
    const rateLimit = await checkSurveyRateLimit({
      route: "unlock",
      headers: request.headers,
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

    const activeSurvey = await getActiveSurveyBundle();

    if (!activeSurvey) {
      return jsonError("No active survey is available yet.", 404);
    }

    if (!verifyAccessCode(parsed.code)) {
      return jsonError("That access code is not valid.", 401);
    }

    const db = getDb();
    const fingerprintHash = createFingerprintHash(request.headers);
    const cookieHeader = request.headers.get("cookie");
    const cookieToken =
      cookieHeader
        ?.split(";")
        .map((part) => part.trim())
        .find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`))
        ?.split("=")
        .slice(1)
        .join("=") ?? null;

    let sessionToken = cookieToken;
    let session = sessionToken
      ? await findSessionByCookieToken(sessionToken)
      : null;

    if (!session) {
      const fallback =
        await findLatestResponseReferenceByFingerprintHash(fingerprintHash);

      if (fallback) {
        const response = await getResponseBundle(fallback.responseId);
        session = response?.session ?? null;
      }
    }

    if (
      !sessionToken ||
      !session ||
      hashSessionToken(sessionToken) !== session.sessionTokenHash
    ) {
      sessionToken = createAnonymousSessionToken();
    }

    const now = new Date();

    if (!session) {
      const [createdSession] = await db
        .insert(anonymousSessions)
        .values({
          sessionTokenHash: hashSessionToken(sessionToken),
          fingerprintHash,
          unlockedAt: now,
          lastSeenAt: now,
          updatedAt: now,
        })
        .returning();

      session = createdSession;
    } else {
      await db
        .update(anonymousSessions)
        .set({
          sessionTokenHash: hashSessionToken(sessionToken),
          fingerprintHash,
          lastSeenAt: now,
          updatedAt: now,
        })
        .where(eq(anonymousSessions.id, session.id));
    }

    const existingResponseId = await findLatestResponseReferenceForSession(
      session.id,
    );

    let responseId = existingResponseId;

    if (!responseId) {
      const [createdResponse] = await db
        .insert(surveyResponses)
        .values({
          sessionId: session.id,
          surveyVersionId: activeSurvey.id,
          currentSectionId: activeSurvey.sections[0]?.id ?? null,
          status: "draft",
        })
        .returning({ id: surveyResponses.id });

      responseId = createdResponse.id;
    }

    const responseBundle = await getResponseBundle(responseId);

    if (!responseBundle) {
      return jsonError("We could not load the survey after unlocking it.", 500);
    }

    const serializedSurvey = serializeSurvey(responseBundle.surveyVersion);
    const chatState = await ensureSurveyChatState({
      responseId: responseBundle.id,
      survey: serializedSurvey,
      answers: serializeSurveyResponse(responseBundle).answers,
    });

    const response = NextResponse.json({
      survey: serializedSurvey,
      response: serializeSurveyResponse(responseBundle, chatState),
    });

    response.cookies.set(
      SESSION_COOKIE_NAME,
      sessionToken,
      getSessionCookieOptions(),
    );

    return response;
  } catch (error) {
    if (error instanceof SurveyValidationError || error instanceof ZodError) {
      return jsonError(error.message, 400);
    }

    return jsonError("Failed to unlock the survey.", 500);
  }
}
