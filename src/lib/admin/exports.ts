import { and, asc, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { surveyAnswers, surveyResponses } from "@/db/schema";
import type { AdminFilters } from "@/lib/admin/filters";
import { getAdminScopeOptions } from "@/lib/admin/reports";

export async function buildResponsesCsv(filters: AdminFilters) {
  const db = getDb();
  const scope = await getAdminScopeOptions(filters);

  if (!scope) {
    return "";
  }

  const whereConditions = [eq(surveyResponses.surveyVersionId, scope.version.id)];

  if (filters.status !== "all") {
    whereConditions.push(eq(surveyResponses.status, filters.status));
  }

  const rows = await db.query.surveyResponses.findMany({
    where: and(...whereConditions),
    with: { answers: true },
    orderBy: (table) => [asc(table.startedAt)],
  });

  const header = [
    "response_id",
    "status",
    "started_at",
    "last_saved_at",
    "submitted_at",
    "question_key",
    "question_analytics_key",
    "value_text",
    "value_json",
    "selected_option_analytics_keys",
  ];

  const lines = [header.join(",")];

  for (const response of rows) {
    for (const answer of response.answers) {
      lines.push(
        [
          response.id,
          response.status,
          response.startedAt.toISOString(),
          response.lastSavedAt.toISOString(),
          response.submittedAt?.toISOString() ?? "",
          answer.questionKeySnapshot,
          answer.questionAnalyticsKeySnapshot ?? "",
          JSON.stringify(answer.valueText ?? ""),
          JSON.stringify(answer.valueJson ?? null),
          JSON.stringify(answer.selectedOptionAnalyticsKeysSnapshot ?? []),
        ].join(","),
      );
    }
  }

  return lines.join("\n");
}

export async function buildResponsesJson(filters: AdminFilters) {
  const db = getDb();
  const scope = await getAdminScopeOptions(filters);

  if (!scope) {
    return [];
  }

  const whereConditions = [eq(surveyResponses.surveyVersionId, scope.version.id)];

  if (filters.status !== "all") {
    whereConditions.push(eq(surveyResponses.status, filters.status));
  }

  return db.query.surveyResponses.findMany({
    where: and(...whereConditions),
    with: { answers: true },
    orderBy: (table) => [asc(table.startedAt)],
  });
}
