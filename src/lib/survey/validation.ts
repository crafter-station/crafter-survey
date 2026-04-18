import { z } from "zod";

import type {
  JsonValue,
  MultiSelectAnswerValue,
  SerializedAnswer,
  SerializedSurvey,
  SingleSelectAnswerValue,
  SurveyQuestion,
} from "@/types/survey";

export class SurveyValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SurveyValidationError";
  }
}

export interface PreparedAnswerChange {
  questionId: string;
  questionKeySnapshot: string;
  questionAnalyticsKeySnapshot: string;
  selectedOptionAnalyticsKeysSnapshot: string[] | null;
  valueText: string | null;
  valueJson: JsonValue | null;
  clientUpdatedAt: Date;
  delete: boolean;
}

interface IncomingAnswerPayload {
  questionId: string;
  valueText: string | null;
  valueJson: unknown;
  clientUpdatedAt: string;
}

const answerPayloadSchema = z.object({
  questionId: z.string().uuid(),
  valueText: z.string().nullable(),
  valueJson: z.unknown().nullable(),
  clientUpdatedAt: z.string().datetime({ offset: true }),
});

export const unlockRequestSchema = z.object({
  code: z.string().trim().min(1).max(128),
});

export const saveRequestSchema = z.object({
  responseId: z.string().uuid(),
  currentSectionId: z.string().uuid().nullable(),
  answers: z.array(answerPayloadSchema).max(64),
});

export const submitRequestSchema = saveRequestSchema;

function getQuestionMap(survey: SerializedSurvey) {
  const questions = survey.sections.flatMap((section) => section.questions);

  return new Map(questions.map((question) => [question.id, question]));
}

function normalizeTextValue(valueText: string | null) {
  const trimmed = valueText?.trim() ?? "";

  return trimmed.length > 0 ? trimmed : null;
}

function getMaxLength(question: SurveyQuestion) {
  const value = question.validation?.maxLength;

  return typeof value === "number" ? value : null;
}

function getMaxSelections(question: SurveyQuestion) {
  const value = question.validation?.maxSelections;

  return typeof value === "number" ? value : null;
}

function getOption(question: SurveyQuestion, key: string) {
  return question.options.find((option) => option.key === key) ?? null;
}

function ensureSupportedQuestion(question: SurveyQuestion) {
  const supportedTypes = new Set([
    "short_text",
    "long_text",
    "single_select",
    "multi_select",
    "email",
    "phone",
  ]);

  if (!supportedTypes.has(question.questionType)) {
    throw new SurveyValidationError(
      `Unsupported question type for ${question.key}: ${question.questionType}`,
    );
  }
}

function sanitizeTextAnswer(
  question: SurveyQuestion,
  payload: IncomingAnswerPayload,
): PreparedAnswerChange {
  const valueText = normalizeTextValue(payload.valueText);
  const maxLength = getMaxLength(question);

  if (maxLength && valueText && valueText.length > maxLength) {
    throw new SurveyValidationError(
      `${question.prompt} must be ${maxLength} characters or fewer.`,
    );
  }

  if (question.questionType === "email" && valueText) {
    const result = z.string().email().safeParse(valueText);

    if (!result.success) {
      throw new SurveyValidationError("Please enter a valid email address.");
    }
  }

  if (
    question.questionType === "phone" &&
    valueText &&
    !/^[+0-9()\-\s]{7,}$/.test(valueText)
  ) {
    throw new SurveyValidationError("Please enter a valid phone number.");
  }

  return {
    questionId: question.id,
    questionKeySnapshot: question.key,
    questionAnalyticsKeySnapshot: question.analyticsKey,
    selectedOptionAnalyticsKeysSnapshot: null,
    valueText,
    valueJson: null,
    clientUpdatedAt: new Date(payload.clientUpdatedAt),
    delete: valueText === null,
  };
}

function sanitizeSingleSelectAnswer(
  question: SurveyQuestion,
  payload: IncomingAnswerPayload,
): PreparedAnswerChange {
  const parsed = z
    .object({
      choice: z.string().nullable(),
      otherText: z.string().optional(),
    })
    .safeParse(payload.valueJson ?? null);

  if (!parsed.success) {
    throw new SurveyValidationError(
      `Invalid answer payload for ${question.prompt}.`,
    );
  }

  const choice = parsed.data.choice;

  if (!choice) {
    return {
      questionId: question.id,
      questionKeySnapshot: question.key,
      questionAnalyticsKeySnapshot: question.analyticsKey,
      selectedOptionAnalyticsKeysSnapshot: null,
      valueText: null,
      valueJson: null,
      clientUpdatedAt: new Date(payload.clientUpdatedAt),
      delete: true,
    };
  }

  const option = getOption(question, choice);

  if (!option) {
    throw new SurveyValidationError(
      `Invalid option selected for ${question.prompt}.`,
    );
  }

  const otherText = normalizeTextValue(parsed.data.otherText ?? null);
  const allowsText = Boolean(option.meta?.allowsText);

  if (allowsText && !otherText) {
    throw new SurveyValidationError(`Add more detail for ${question.prompt}.`);
  }

  return {
    questionId: question.id,
    questionKeySnapshot: question.key,
    questionAnalyticsKeySnapshot: question.analyticsKey,
    selectedOptionAnalyticsKeysSnapshot: [option.analyticsKey],
    valueText: null,
    valueJson: {
      choice,
      ...(allowsText && otherText ? { otherText } : {}),
    } satisfies SingleSelectAnswerValue,
    clientUpdatedAt: new Date(payload.clientUpdatedAt),
    delete: false,
  };
}

function sanitizeMultiSelectAnswer(
  question: SurveyQuestion,
  payload: IncomingAnswerPayload,
): PreparedAnswerChange {
  const parsed = z
    .object({
      choices: z.array(z.string()),
      otherText: z.string().optional(),
    })
    .safeParse(payload.valueJson ?? null);

  if (!parsed.success) {
    throw new SurveyValidationError(
      `Invalid answer payload for ${question.prompt}.`,
    );
  }

  const choices = Array.from(new Set(parsed.data.choices)).filter((choice) =>
    Boolean(getOption(question, choice)),
  );

  const maxSelections = getMaxSelections(question);

  if (maxSelections && choices.length > maxSelections) {
    throw new SurveyValidationError(
      `${question.prompt} allows up to ${maxSelections} selections.`,
    );
  }

  if (choices.length === 0) {
    return {
      questionId: question.id,
      questionKeySnapshot: question.key,
      questionAnalyticsKeySnapshot: question.analyticsKey,
      selectedOptionAnalyticsKeysSnapshot: null,
      valueText: null,
      valueJson: null,
      clientUpdatedAt: new Date(payload.clientUpdatedAt),
      delete: true,
    };
  }

  const otherOptionSelected = choices.some((choice) =>
    Boolean(getOption(question, choice)?.meta?.allowsText),
  );
  const otherText = normalizeTextValue(parsed.data.otherText ?? null);

  if (otherOptionSelected && !otherText) {
    throw new SurveyValidationError(`Add more detail for ${question.prompt}.`);
  }

  return {
    questionId: question.id,
    questionKeySnapshot: question.key,
    questionAnalyticsKeySnapshot: question.analyticsKey,
    selectedOptionAnalyticsKeysSnapshot: choices.map((choice) => {
      const option = getOption(question, choice);

      if (!option) {
        throw new SurveyValidationError(
          `Invalid option selected for ${question.prompt}.`,
        );
      }

      return option.analyticsKey;
    }),
    valueText: null,
    valueJson: {
      choices,
      ...(otherOptionSelected && otherText ? { otherText } : {}),
    } satisfies MultiSelectAnswerValue,
    clientUpdatedAt: new Date(payload.clientUpdatedAt),
    delete: false,
  };
}

export function prepareAnswerChanges(
  survey: SerializedSurvey,
  answerPayloads: IncomingAnswerPayload[],
) {
  const questionMap = getQuestionMap(survey);
  const deduped = new Map(
    answerPayloads.map((answer) => [answer.questionId, answer]),
  );

  return Array.from(deduped.values()).map((payload) => {
    const question = questionMap.get(payload.questionId);

    if (!question) {
      throw new SurveyValidationError(
        "A submitted question does not exist in this survey version.",
      );
    }

    ensureSupportedQuestion(question);

    switch (question.questionType) {
      case "short_text":
      case "long_text":
      case "email":
      case "phone":
        return sanitizeTextAnswer(question, payload);
      case "single_select":
        return sanitizeSingleSelectAnswer(question, payload);
      case "multi_select":
        return sanitizeMultiSelectAnswer(question, payload);
      default:
        throw new SurveyValidationError(
          `Unsupported question type for ${question.key}: ${question.questionType}`,
        );
    }
  });
}

export function assertSectionBelongsToSurvey(
  survey: SerializedSurvey,
  sectionId: string | null,
) {
  if (!sectionId) {
    return;
  }

  const sectionExists = survey.sections.some(
    (section) => section.id === sectionId,
  );

  if (!sectionExists) {
    throw new SurveyValidationError(
      "The submitted section does not belong to this survey.",
    );
  }
}

function readSingleSelect(answer: SerializedAnswer | undefined) {
  const parsed = z
    .object({
      choice: z.string().nullable(),
    })
    .safeParse(answer?.valueJson ?? null);

  return parsed.success ? parsed.data.choice : null;
}

function readMultiSelect(answer: SerializedAnswer | undefined) {
  const parsed = z
    .object({
      choices: z.array(z.string()),
    })
    .safeParse(answer?.valueJson ?? null);

  return parsed.success ? parsed.data.choices : [];
}

export function getMissingRequiredQuestionIds(
  survey: SerializedSurvey,
  answers: Record<string, SerializedAnswer>,
) {
  const missing: string[] = [];

  for (const section of survey.sections) {
    for (const question of section.questions) {
      if (!question.required) {
        continue;
      }

      const answer = answers[question.id];

      switch (question.questionType) {
        case "short_text":
        case "long_text":
        case "email":
        case "phone":
          if (!answer?.valueText?.trim()) {
            missing.push(question.id);
          }
          break;
        case "single_select":
          if (!readSingleSelect(answer)) {
            missing.push(question.id);
          }
          break;
        case "multi_select":
          if (readMultiSelect(answer).length === 0) {
            missing.push(question.id);
          }
          break;
      }
    }
  }

  return missing;
}
