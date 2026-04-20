import type {
  JsonValue,
  SerializedAnswer,
  SerializedSurvey,
  SerializedSurveyChatState,
  SerializedSurveyResponse,
  SurveyGateMeta,
  SurveyQuestionType,
} from "@/types/survey";

interface SurveyVersionBundle {
  id: string;
  versionNumber: number;
  title: string;
  description: string | null;
  completionTitle: string | null;
  completionDescription: string | null;
  survey: {
    id: string;
    slug: string;
    title: string;
    description: string | null;
  };
  sections: Array<{
    id: string;
    key: string;
    title: string;
    description: string | null;
    sortOrder: number;
    questions: Array<{
      id: string;
      analyticsKey: string | null;
      key: string;
      prompt: string;
      helpText: string | null;
      questionType: string;
      required: boolean;
      placeholder: string | null;
      sortOrder: number;
      validationJson: Record<string, unknown> | null;
      uiJson: Record<string, unknown> | null;
      options: Array<{
        id: string;
        analyticsKey: string | null;
        key: string;
        label: string;
        helpText: string | null;
        metaJson: Record<string, unknown> | null;
        sortOrder: number;
      }>;
    }>;
  }>;
}

interface ResponseBundle {
  id: string;
  status: string;
  currentSectionId: string | null;
  lastSavedAt: Date;
  submittedAt: Date | null;
  answers: Array<{
    questionId: string;
    questionAnalyticsKeySnapshot: string | null;
    selectedOptionAnalyticsKeysSnapshot: string[] | null;
    valueText: string | null;
    valueJson: Record<string, unknown> | string[] | string | null;
    clientUpdatedAt: Date;
  }>;
}

export function buildGateMeta(bundle: SurveyVersionBundle): SurveyGateMeta {
  return {
    surveyId: bundle.survey.id,
    surveySlug: bundle.survey.slug,
    title: bundle.title,
    description: bundle.description,
  };
}

export function serializeSurvey(bundle: SurveyVersionBundle): SerializedSurvey {
  return {
    surveyId: bundle.survey.id,
    surveySlug: bundle.survey.slug,
    surveyVersionId: bundle.id,
    versionNumber: bundle.versionNumber,
    title: bundle.title,
    description: bundle.description,
    completionTitle: bundle.completionTitle,
    completionDescription: bundle.completionDescription,
    sections: bundle.sections.map((section) => ({
      id: section.id,
      key: section.key,
      title: section.title,
      description: section.description,
      sortOrder: section.sortOrder,
      questions: section.questions.map((question) => ({
        id: question.id,
        analyticsKey: question.analyticsKey ?? `${section.key}.${question.key}`,
        key: question.key,
        prompt: question.prompt,
        helpText: question.helpText,
        questionType: question.questionType as SurveyQuestionType,
        required: question.required,
        placeholder: question.placeholder,
        sortOrder: question.sortOrder,
        validation: question.validationJson as Record<string, unknown> | null,
        ui: question.uiJson as Record<string, unknown> | null,
        options: question.options.map((option) => ({
          id: option.id,
          analyticsKey:
            option.analyticsKey ??
            `${question.analyticsKey ?? `${section.key}.${question.key}`}.${option.key}`,
          key: option.key,
          label: option.label,
          helpText: option.helpText,
          meta: option.metaJson,
        })),
      })),
    })),
  };
}

export function serializeSurveyResponse(
  response: ResponseBundle,
  chatState: SerializedSurveyChatState | null = null,
): SerializedSurveyResponse {
  const answers = Object.fromEntries(
    response.answers.map((answer) => {
      const serialized: SerializedAnswer = {
        questionId: answer.questionId,
        questionAnalyticsKeySnapshot: answer.questionAnalyticsKeySnapshot,
        selectedOptionAnalyticsKeysSnapshot:
          answer.selectedOptionAnalyticsKeysSnapshot,
        valueText: answer.valueText,
        valueJson: answer.valueJson as JsonValue | null,
        clientUpdatedAt: answer.clientUpdatedAt.toISOString(),
      };

      return [answer.questionId, serialized];
    }),
  );

  return {
    id: response.id,
    status: response.status === "submitted" ? "submitted" : "draft",
    currentSectionId: response.currentSectionId,
    lastSavedAt: response.lastSavedAt.toISOString(),
    submittedAt: response.submittedAt?.toISOString() ?? null,
    answers,
    chatState,
  };
}
