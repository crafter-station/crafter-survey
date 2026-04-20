import { and, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { surveyResponses } from "@/db/schema";

import { getResponseBundle } from "./load-survey";
import { saveSurveyProgress } from "./save-progress";
import { serializeSurveyResponse } from "./serialize";
import type { PreparedAnswerChange } from "./validation";

export async function submitSurveyResponse({
  changes,
  currentSectionId,
  responseId,
}: {
  changes: PreparedAnswerChange[];
  currentSectionId: string | null;
  responseId: string;
}) {
  const db = getDb();

  await saveSurveyProgress({
    responseId,
    currentSectionId,
    changes,
  });

  const refreshed = await getResponseBundle(responseId);

  if (!refreshed) {
    throw new Error("Survey response not found after save.");
  }

  const now = new Date();

  await db
    .update(surveyResponses)
    .set({
      status: "submitted",
      submittedAt: now,
      lastSavedAt: now,
      currentSectionId,
    })
    .where(
      and(
        eq(surveyResponses.id, responseId),
        eq(surveyResponses.status, "draft"),
      ),
    );

  const submitted = await getResponseBundle(responseId);

  if (!submitted) {
    throw new Error("Survey response not found after submit.");
  }

  return {
    ok: true as const,
    response: serializeSurveyResponse(submitted),
  };
}
