import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  surveyAnswers,
  surveyQuestionOptions,
  surveyQuestions,
  surveyResponses,
  surveySections,
  surveys,
  surveyVersions,
} from "@/db/schema";
import type { AdminFilters } from "@/lib/admin/filters";

const RESPONSE_PAGE_SIZE = 25;

type GroupedAnswer = {
  count: number;
  value: string;
};

function normalizeAnswerForGrouping(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";

  if (!trimmed) {
    return null;
  }

  return trimmed.normalize("NFKC").replace(/\s+/g, " ").toLocaleLowerCase();
}

function sortGroupedAnswers(groupedAnswers: GroupedAnswer[]) {
  return groupedAnswers.sort(
    (left, right) =>
      right.count - left.count || left.value.localeCompare(right.value),
  );
}

function groupAnswerValues(values: Array<string | null | undefined>) {
  const groupedAnswers = new Map<string, GroupedAnswer>();

  for (const value of values) {
    const key = normalizeAnswerForGrouping(value);
    const trimmedValue = value?.trim() ?? "";

    if (!key || !trimmedValue) {
      continue;
    }

    const existing = groupedAnswers.get(key);

    if (existing) {
      existing.count += 1;

      if (trimmedValue.length < existing.value.length) {
        existing.value = trimmedValue;
      }

      continue;
    }

    groupedAnswers.set(key, { count: 1, value: trimmedValue });
  }

  return sortGroupedAnswers(Array.from(groupedAnswers.values()));
}

function readOtherText(valueJson: unknown) {
  if (!valueJson || typeof valueJson !== "object" || Array.isArray(valueJson)) {
    return null;
  }

  const otherText = "otherText" in valueJson ? valueJson.otherText : null;

  return typeof otherText === "string" ? otherText : null;
}

type Scope = {
  survey: { id: string; slug: string; title: string };
  version: { id: string; versionNumber: number; title: string; status: string };
  surveys: Array<{ slug: string; title: string }>;
  versions: Array<{
    id: string;
    versionNumber: number;
    title: string;
    status: string;
  }>;
};

export async function getAdminScopeOptions(
  filters: AdminFilters,
): Promise<Scope | null> {
  const db = getDb();

  const surveyRows = await db
    .select({ id: surveys.id, slug: surveys.slug, title: surveys.title })
    .from(surveys)
    .orderBy(asc(surveys.title));

  const selectedSurvey =
    surveyRows.find((survey) => survey.slug === filters.surveySlug) ??
    surveyRows[0] ??
    null;

  if (!selectedSurvey) {
    return null;
  }

  const versionRows = await db
    .select({
      id: surveyVersions.id,
      versionNumber: surveyVersions.versionNumber,
      title: surveyVersions.title,
      status: surveyVersions.status,
    })
    .from(surveyVersions)
    .where(eq(surveyVersions.surveyId, selectedSurvey.id))
    .orderBy(desc(surveyVersions.versionNumber));

  const selectedVersion =
    versionRows.find((version) => version.id === filters.surveyVersionId) ??
    versionRows.find((version) => version.status === "active") ??
    versionRows[0] ??
    null;

  if (!selectedVersion) {
    return null;
  }

  return {
    survey: selectedSurvey,
    version: selectedVersion,
    surveys: surveyRows.map((survey) => ({
      slug: survey.slug,
      title: survey.title,
    })),
    versions: versionRows,
  };
}

export async function getOverviewReport(filters: AdminFilters) {
  const db = getDb();
  const scope = await getAdminScopeOptions(filters);

  if (!scope) {
    return null;
  }

  const [totals] = await db
    .select({
      total: count(surveyResponses.id),
      submitted: sql<number>`count(*) filter (where ${surveyResponses.status} = 'submitted')`,
      draft: sql<number>`count(*) filter (where ${surveyResponses.status} = 'draft')`,
    })
    .from(surveyResponses)
    .where(eq(surveyResponses.surveyVersionId, scope.version.id));

  const recentResponses = await db
    .select({
      id: surveyResponses.id,
      status: surveyResponses.status,
      startedAt: surveyResponses.startedAt,
      submittedAt: surveyResponses.submittedAt,
      lastSavedAt: surveyResponses.lastSavedAt,
    })
    .from(surveyResponses)
    .where(eq(surveyResponses.surveyVersionId, scope.version.id))
    .orderBy(desc(surveyResponses.lastSavedAt))
    .limit(10);

  const completionRate =
    totals && Number(totals.total) > 0
      ? Number(totals.submitted) / Number(totals.total)
      : 0;

  return {
    scope,
    metrics: {
      total: Number(totals?.total ?? 0),
      submitted: Number(totals?.submitted ?? 0),
      draft: Number(totals?.draft ?? 0),
      completionRate,
    },
    recentResponses,
  };
}

export async function getQuestionList(filters: AdminFilters) {
  const db = getDb();
  const scope = await getAdminScopeOptions(filters);

  if (!scope) {
    return null;
  }

  const rows = await db
    .select({
      sectionTitle: surveySections.title,
      sectionKey: surveySections.key,
      questionId: surveyQuestions.id,
      questionKey: surveyQuestions.key,
      prompt: surveyQuestions.prompt,
      questionType: surveyQuestions.questionType,
    })
    .from(surveyQuestions)
    .innerJoin(
      surveySections,
      eq(surveyQuestions.surveySectionId, surveySections.id),
    )
    .where(eq(surveySections.surveyVersionId, scope.version.id))
    .orderBy(asc(surveySections.sortOrder), asc(surveyQuestions.sortOrder));

  return { scope, questions: rows };
}

export async function getQuestionBreakdown(filters: AdminFilters) {
  const db = getDb();
  const scope = await getAdminScopeOptions(filters);

  if (!scope) {
    return null;
  }

  const questions = await getQuestionList(filters);
  const selectedQuestion =
    questions?.questions.find(
      (question) => question.questionKey === filters.questionKey,
    ) ??
    questions?.questions[0] ??
    null;

  if (!selectedQuestion) {
    return {
      scope,
      questions: questions?.questions ?? [],
      selectedQuestion: null,
    };
  }

  const responseConditions = [
    eq(surveyResponses.surveyVersionId, scope.version.id),
  ];

  if (!filters.includeDrafts) {
    responseConditions.push(eq(surveyResponses.status, "submitted"));
  }

  const matchingResponseIds = await db
    .select({ id: surveyResponses.id })
    .from(surveyResponses)
    .where(and(...responseConditions));

  const responseIds = matchingResponseIds.map((row) => row.id);

  const answers = responseIds.length
    ? await db
        .select({
          valueText: surveyAnswers.valueText,
          valueJson: surveyAnswers.valueJson,
          selectedOptionAnalyticsKeysSnapshot:
            surveyAnswers.selectedOptionAnalyticsKeysSnapshot,
        })
        .from(surveyAnswers)
        .where(
          and(
            eq(surveyAnswers.questionId, selectedQuestion.questionId),
            inArray(surveyAnswers.responseId, responseIds),
          ),
        )
    : [];

  const options = await db
    .select({
      id: surveyQuestionOptions.id,
      key: surveyQuestionOptions.key,
      label: surveyQuestionOptions.label,
      analyticsKey: surveyQuestionOptions.analyticsKey,
    })
    .from(surveyQuestionOptions)
    .where(eq(surveyQuestionOptions.questionId, selectedQuestion.questionId))
    .orderBy(asc(surveyQuestionOptions.sortOrder));

  const optionCounts = new Map<string, number>();
  const textAnswers: string[] = [];
  const otherAnswers: string[] = [];

  for (const answer of answers) {
    for (const key of answer.selectedOptionAnalyticsKeysSnapshot ?? []) {
      optionCounts.set(key, (optionCounts.get(key) ?? 0) + 1);
    }

    if (answer.valueText?.trim()) {
      textAnswers.push(answer.valueText.trim());
    }

    const otherText = readOtherText(answer.valueJson);

    if (otherText?.trim()) {
      otherAnswers.push(otherText.trim());
    }
  }

  return {
    scope,
    questions: questions?.questions ?? [],
    selectedQuestion,
    answeredCount: answers.length,
    includesDrafts: filters.includeDrafts,
    totalResponses: responseIds.length,
    optionBreakdown: options.map((option) => ({
      ...option,
      count: option.analyticsKey
        ? (optionCounts.get(option.analyticsKey) ?? 0)
        : 0,
    })),
    groupedOtherAnswers: groupAnswerValues(otherAnswers),
    groupedTextAnswers: groupAnswerValues(textAnswers),
  };
}

export async function listResponses(filters: AdminFilters) {
  const db = getDb();
  const scope = await getAdminScopeOptions(filters);

  if (!scope) {
    return null;
  }

  const whereConditions = [
    eq(surveyResponses.surveyVersionId, scope.version.id),
  ];

  if (filters.status !== "all") {
    whereConditions.push(eq(surveyResponses.status, filters.status));
  }

  const responses = await db.query.surveyResponses.findMany({
    where: and(...whereConditions),
    with: {
      answers: true,
    },
    orderBy: (table) => [desc(table.lastSavedAt)],
    limit: RESPONSE_PAGE_SIZE,
    offset: (filters.page - 1) * RESPONSE_PAGE_SIZE,
  });

  const filteredResponses = filters.query
    ? responses.filter((response) =>
        response.id.toLowerCase().includes(filters.query.toLowerCase()),
      )
    : responses;

  return {
    scope,
    page: filters.page,
    pageSize: RESPONSE_PAGE_SIZE,
    responses: filteredResponses.map((response) => ({
      id: response.id,
      status: response.status,
      startedAt: response.startedAt,
      lastSavedAt: response.lastSavedAt,
      submittedAt: response.submittedAt,
      answerCount: response.answers.length,
    })),
  };
}

export async function getResponseDetail(responseId: string) {
  const db = getDb();

  const response = await db.query.surveyResponses.findFirst({
    where: eq(surveyResponses.id, responseId),
    with: {
      surveyVersion: {
        with: {
          survey: true,
          sections: {
            orderBy: () => [asc(surveySections.sortOrder)],
            with: {
              questions: {
                orderBy: () => [asc(surveyQuestions.sortOrder)],
              },
            },
          },
        },
      },
      answers: true,
      chatState: true,
    },
  });

  if (!response) {
    return null;
  }

  const answerMap = new Map(
    response.answers.map((answer) => [answer.questionId, answer]),
  );

  return {
    id: response.id,
    status: response.status,
    startedAt: response.startedAt,
    lastSavedAt: response.lastSavedAt,
    submittedAt: response.submittedAt,
    surveyTitle: response.surveyVersion.title,
    sections: response.surveyVersion.sections.map((section) => ({
      id: section.id,
      title: section.title,
      questions: section.questions.map((question) => ({
        id: question.id,
        key: question.key,
        prompt: question.prompt,
        questionType: question.questionType,
        answer: answerMap.get(question.id) ?? null,
      })),
    })),
    chatState: response.chatState,
  };
}
