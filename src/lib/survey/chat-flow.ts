import type {
  SerializedAnswer,
  SerializedSurvey,
  SurveyChatClusterState,
  SurveyChatMessage,
  SurveyChatMeta,
  SurveyQuestion,
} from "@/types/survey";

import {
  type ResolvedConversationPlaybookCluster,
  resolveConversationPlaybook,
} from "./conversation-playbook";

function isQuestionAnswered(
  question: SurveyQuestion,
  answer: SerializedAnswer | undefined,
) {
  switch (question.questionType) {
    case "short_text":
    case "long_text":
    case "email":
    case "phone":
      return Boolean(answer?.valueText?.trim());
    case "single_select": {
      const candidate = answer?.valueJson;
      return Boolean(
        candidate &&
          typeof candidate === "object" &&
          !Array.isArray(candidate) &&
          "choice" in candidate &&
          typeof candidate.choice === "string",
      );
    }
    case "multi_select": {
      const candidate = answer?.valueJson;
      return Boolean(
        candidate &&
          typeof candidate === "object" &&
          !Array.isArray(candidate) &&
          "choices" in candidate &&
          Array.isArray(candidate.choices) &&
          candidate.choices.some((choice) => typeof choice === "string"),
      );
    }
  }
}

export function normalizeSurveyChatMeta(meta: unknown): SurveyChatMeta {
  const candidate =
    meta && typeof meta === "object" ? (meta as Partial<SurveyChatMeta>) : null;
  const rawClusterStates =
    candidate?.clusterStates && typeof candidate.clusterStates === "object"
      ? candidate.clusterStates
      : {};

  return {
    activeClusterKey:
      typeof candidate?.activeClusterKey === "string"
        ? candidate.activeClusterKey
        : null,
    lastCompletedClusterKey:
      typeof candidate?.lastCompletedClusterKey === "string"
        ? candidate.lastCompletedClusterKey
        : null,
    skippedQuestionIds: Array.from(
      new Set(
        Array.isArray(candidate?.skippedQuestionIds)
          ? candidate.skippedQuestionIds.filter(
              (questionId): questionId is string =>
                typeof questionId === "string",
            )
          : [],
      ),
    ),
    clusterStates: Object.fromEntries(
      Object.entries(rawClusterStates).map(([clusterKey, value]) => {
        const candidate = value as Partial<SurveyChatClusterState> | null;
        const status =
          candidate?.status === "pending" ||
          candidate?.status === "in_progress" ||
          candidate?.status === "done" ||
          candidate?.status === "skipped"
            ? candidate.status
            : "pending";

        return [
          clusterKey,
          {
            status,
            answeredQuestionIds: Array.isArray(candidate?.answeredQuestionIds)
              ? candidate.answeredQuestionIds.filter(
                  (questionId): questionId is string =>
                    typeof questionId === "string",
                )
              : [],
            unresolvedQuestionIds: Array.isArray(
              candidate?.unresolvedQuestionIds,
            )
              ? candidate.unresolvedQuestionIds.filter(
                  (questionId): questionId is string =>
                    typeof questionId === "string",
                )
              : [],
          } satisfies SurveyChatClusterState,
        ];
      }),
    ),
  };
}

export function getSurveyQuestionIndex(survey: SerializedSurvey) {
  const index = new Map<
    string,
    { question: SurveyQuestion; sectionId: string; sectionTitle: string }
  >();

  for (const section of survey.sections) {
    for (const question of section.questions) {
      index.set(question.id, {
        question,
        sectionId: section.id,
        sectionTitle: section.title,
      });
    }
  }

  return index;
}

function buildClusterState(
  cluster: ResolvedConversationPlaybookCluster,
  answers: Record<string, SerializedAnswer>,
  skippedQuestionIds: string[],
): SurveyChatClusterState {
  const skipped = new Set(skippedQuestionIds);
  const answeredQuestionIds: string[] = [];
  const unresolvedQuestionIds = new Set<string>();
  const completionQuestionKeys = new Set(
    cluster.completionQuestionKeys ?? cluster.questionKeys,
  );

  for (const entry of cluster.questions) {
    if (skipped.has(entry.question.id)) {
      continue;
    }

    if (isQuestionAnswered(entry.question, answers[entry.question.id])) {
      answeredQuestionIds.push(entry.question.id);
      continue;
    }

    if (completionQuestionKeys.has(entry.question.key)) {
      unresolvedQuestionIds.add(entry.question.id);
    }
  }

  const completionQuestions = cluster.questions.filter((entry) =>
    completionQuestionKeys.has(entry.question.key),
  );
  const allSkipped =
    completionQuestions.length > 0 &&
    completionQuestions.every((entry) => skipped.has(entry.question.id));

  const status = allSkipped
    ? "skipped"
    : unresolvedQuestionIds.size === 0
      ? "done"
      : answeredQuestionIds.length > 0
        ? "in_progress"
        : "pending";

  return {
    status,
    answeredQuestionIds,
    unresolvedQuestionIds: Array.from(unresolvedQuestionIds),
  };
}

export function buildSurveyChatMeta({
  survey,
  answers,
  meta,
  activeClusterKeyOverride,
}: {
  survey: SerializedSurvey;
  answers: Record<string, SerializedAnswer>;
  meta: unknown;
  activeClusterKeyOverride?: string | null;
}): SurveyChatMeta {
  const normalizedMeta = normalizeSurveyChatMeta(meta);
  const playbook = resolveConversationPlaybook(survey);
  const clusterStates = Object.fromEntries(
    playbook.map((cluster) => [
      cluster.key,
      buildClusterState(cluster, answers, normalizedMeta.skippedQuestionIds),
    ]),
  ) as Record<string, SurveyChatClusterState>;

  const preferredActiveClusterKey =
    activeClusterKeyOverride ?? normalizedMeta.activeClusterKey;
  const preferredState = preferredActiveClusterKey
    ? clusterStates[preferredActiveClusterKey]
    : null;
  const activeClusterKey =
    preferredState &&
    (preferredState.status === "pending" ||
      preferredState.status === "in_progress")
      ? preferredActiveClusterKey
      : (playbook.find((cluster) => {
          const state = clusterStates[cluster.key];

          return state?.status === "pending" || state?.status === "in_progress";
        })?.key ?? null);
  const lastCompletedClusterKey =
    [...playbook]
      .reverse()
      .find((cluster) => clusterStates[cluster.key]?.status === "done")?.key ??
    null;

  return {
    activeClusterKey,
    lastCompletedClusterKey,
    skippedQuestionIds: normalizedMeta.skippedQuestionIds,
    clusterStates,
  };
}

export function getActiveConversationCluster({
  survey,
  meta,
}: {
  survey: SerializedSurvey;
  meta: SurveyChatMeta;
}) {
  const playbook = resolveConversationPlaybook(survey);

  return meta.activeClusterKey
    ? (playbook.find((cluster) => cluster.key === meta.activeClusterKey) ??
        null)
    : null;
}

export function getChatCurrentSectionId({
  survey,
  meta,
}: {
  survey: SerializedSurvey;
  meta: SurveyChatMeta;
}) {
  const activeCluster = getActiveConversationCluster({ survey, meta });

  if (activeCluster) {
    const activeClusterState = meta.clusterStates[activeCluster.key];
    const nextQuestionId = activeClusterState?.unresolvedQuestionIds[0] ?? null;
    const nextQuestion = nextQuestionId
      ? activeCluster.questions.find(
          (entry) => entry.question.id === nextQuestionId,
        )
      : (activeCluster.questions[0] ?? null);

    if (nextQuestion) {
      return nextQuestion.sectionId;
    }
  }

  return survey.sections[survey.sections.length - 1]?.id ?? null;
}

export function createInitialSurveyChatMessages({
  survey,
  answers,
  meta,
}: {
  survey: SerializedSurvey;
  answers: Record<string, SerializedAnswer>;
  meta: SurveyChatMeta;
}): SurveyChatMessage[] {
  const activeCluster = getActiveConversationCluster({ survey, meta });
  const answeredCount = Object.values(answers).filter(
    (answer) =>
      Boolean(answer.valueText?.trim()) ||
      (answer.valueJson !== null && answer.valueJson !== undefined),
  ).length;

  const text = activeCluster
    ? answeredCount > 0
      ? activeCluster.resumePrompt
      : activeCluster.opener
    : "Hola. Ya tengo suficiente contexto por ahora. Si quieres, puedo ayudarte a revisar algo antes de cerrar.";

  return [
    {
      id: crypto.randomUUID(),
      role: "assistant",
      parts: [{ type: "text", text }],
    },
  ];
}
