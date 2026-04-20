import { and, asc, desc, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  anonymousSessions,
  surveyQuestionOptions,
  surveyQuestions,
  surveyResponses,
  surveySections,
  surveyVersions,
} from "@/db/schema";
import { getEnvValidationMessage, hasRequiredSurveyEnv } from "@/env";
import { createFingerprintHash } from "@/lib/fingerprint";
import { hashSessionToken } from "@/lib/session";
import type { SurveyPageData } from "@/types/survey";
import { ensureSurveyChatState } from "./chat-persistence";
import {
  buildGateMeta,
  serializeSurvey,
  serializeSurveyResponse,
} from "./serialize";

const surveyVersionWithSections = {
  survey: true,
  sections: {
    orderBy: () => [asc(surveySections.sortOrder)],
    with: {
      questions: {
        orderBy: () => [asc(surveyQuestions.sortOrder)],
        with: {
          options: {
            orderBy: () => [asc(surveyQuestionOptions.sortOrder)],
          },
        },
      },
    },
  },
} as const;

export async function getActiveSurveyBundle() {
  const db = getDb();

  return db.query.surveyVersions.findFirst({
    where: eq(surveyVersions.status, "active"),
    orderBy: (table, { desc }) => [
      desc(table.activatedAt),
      desc(table.createdAt),
    ],
    with: surveyVersionWithSections,
  });
}

export async function getResponseBundle(responseId: string) {
  const db = getDb();

  return db.query.surveyResponses.findFirst({
    where: eq(surveyResponses.id, responseId),
    with: {
      session: true,
      surveyVersion: {
        with: surveyVersionWithSections,
      },
      answers: true,
      chatState: true,
    },
  });
}

export async function findSessionByCookieToken(sessionToken: string) {
  const db = getDb();

  return db.query.anonymousSessions.findFirst({
    where: eq(
      anonymousSessions.sessionTokenHash,
      hashSessionToken(sessionToken),
    ),
  });
}

export async function findLatestResponseReferenceForSession(sessionId: string) {
  const db = getDb();

  const draft = await db.query.surveyResponses.findFirst({
    where: and(
      eq(surveyResponses.sessionId, sessionId),
      eq(surveyResponses.status, "draft"),
    ),
    orderBy: (table, { desc }) => [desc(table.lastSavedAt)],
  });

  if (draft) {
    return draft.id;
  }

  const latest = await db.query.surveyResponses.findFirst({
    where: eq(surveyResponses.sessionId, sessionId),
    orderBy: (table, { desc }) => [desc(table.lastSavedAt)],
  });

  return latest?.id ?? null;
}

export async function findLatestResponseReferenceByFingerprintHash(
  fingerprintHash: string,
) {
  const db = getDb();

  const draft = await db
    .select({
      responseId: surveyResponses.id,
      sessionId: anonymousSessions.id,
    })
    .from(surveyResponses)
    .innerJoin(
      anonymousSessions,
      eq(surveyResponses.sessionId, anonymousSessions.id),
    )
    .where(
      and(
        eq(anonymousSessions.fingerprintHash, fingerprintHash),
        eq(surveyResponses.status, "draft"),
      ),
    )
    .orderBy(desc(surveyResponses.lastSavedAt))
    .limit(1);

  if (draft[0]) {
    return draft[0];
  }

  const latest = await db
    .select({
      responseId: surveyResponses.id,
      sessionId: anonymousSessions.id,
    })
    .from(surveyResponses)
    .innerJoin(
      anonymousSessions,
      eq(surveyResponses.sessionId, anonymousSessions.id),
    )
    .where(eq(anonymousSessions.fingerprintHash, fingerprintHash))
    .orderBy(desc(surveyResponses.lastSavedAt))
    .limit(1);

  return latest[0] ?? null;
}

export async function loadSurveyPageData({
  requestHeaders,
  sessionToken,
}: {
  requestHeaders: Headers;
  sessionToken: string | null;
}): Promise<SurveyPageData> {
  if (!hasRequiredSurveyEnv()) {
    return {
      mode: "unconfigured",
      gate: null,
      survey: null,
      response: null,
      message:
        getEnvValidationMessage() ??
        "Set DATABASE_URL, SESSION_SECRET, and SURVEY_ACCESS_CODE before loading the survey.",
    };
  }

  let responseId: string | null = null;

  if (sessionToken) {
    const session = await findSessionByCookieToken(sessionToken);

    if (session) {
      responseId = await findLatestResponseReferenceForSession(session.id);
    }
  }

  if (!responseId) {
    const fingerprintHash = createFingerprintHash(requestHeaders);
    const fallback =
      await findLatestResponseReferenceByFingerprintHash(fingerprintHash);

    responseId = fallback?.responseId ?? null;
  }

  if (responseId) {
    const response = await getResponseBundle(responseId);

    if (response) {
      const serializedSurvey = serializeSurvey(response.surveyVersion);
      const chatState = await ensureSurveyChatState({
        responseId: response.id,
        survey: serializedSurvey,
        answers: serializeSurveyResponse(response).answers,
      });

      return {
        mode: response.status === "submitted" ? "submitted" : "survey",
        gate: buildGateMeta(response.surveyVersion),
        survey: serializedSurvey,
        response: serializeSurveyResponse(response, chatState),
        message: null,
      };
    }
  }

  const activeSurvey = await getActiveSurveyBundle();

  if (!activeSurvey) {
    return {
      mode: "missing",
      gate: null,
      survey: null,
      response: null,
      message: "No active survey has been published yet.",
    };
  }

  return {
    mode: "gate",
    gate: buildGateMeta(activeSurvey),
    survey: null,
    response: null,
    message: null,
  };
}
