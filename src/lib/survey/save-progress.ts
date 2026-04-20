import { and, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { surveyAnswers, surveyResponses } from "@/db/schema";

import type { PreparedAnswerChange } from "./validation";

export async function saveSurveyProgress({
  changes,
  currentSectionId,
  responseId,
}: {
  changes: PreparedAnswerChange[];
  currentSectionId: string | null;
  responseId: string;
}) {
  const db = getDb();
  const now = new Date();

  for (const change of changes) {
    if (change.delete) {
      await db
        .delete(surveyAnswers)
        .where(
          and(
            eq(surveyAnswers.responseId, responseId),
            eq(surveyAnswers.questionId, change.questionId),
          ),
        );

      continue;
    }

    await db
      .insert(surveyAnswers)
      .values({
        responseId,
        questionId: change.questionId,
        questionKeySnapshot: change.questionKeySnapshot,
        questionAnalyticsKeySnapshot: change.questionAnalyticsKeySnapshot,
        selectedOptionAnalyticsKeysSnapshot:
          change.selectedOptionAnalyticsKeysSnapshot,
        valueText: change.valueText,
        valueJson: change.valueJson as
          | Record<string, unknown>
          | string[]
          | string
          | null,
        clientUpdatedAt: change.clientUpdatedAt,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [surveyAnswers.responseId, surveyAnswers.questionId],
        set: {
          questionKeySnapshot: change.questionKeySnapshot,
          questionAnalyticsKeySnapshot: change.questionAnalyticsKeySnapshot,
          selectedOptionAnalyticsKeysSnapshot:
            change.selectedOptionAnalyticsKeysSnapshot,
          valueText: change.valueText,
          valueJson: change.valueJson as
            | Record<string, unknown>
            | string[]
            | string
            | null,
          clientUpdatedAt: change.clientUpdatedAt,
          updatedAt: now,
        },
      });
  }

  await db
    .update(surveyResponses)
    .set({
      currentSectionId,
      lastSavedAt: now,
    })
    .where(eq(surveyResponses.id, responseId));

  return now;
}

export async function updateSurveyCurrentSection({
  currentSectionId,
  responseId,
}: {
  currentSectionId: string | null;
  responseId: string;
}) {
  const db = getDb();

  await db
    .update(surveyResponses)
    .set({
      currentSectionId,
    })
    .where(eq(surveyResponses.id, responseId));
}
