import type {
  JsonValue,
  MultiSelectAnswerValue,
  SerializedAnswer,
  SingleSelectAnswerValue,
  SurveyQuestion,
} from "@/types/survey";

import { MultiSelectQuestion } from "./questions/multi-select-question";
import { SingleSelectQuestion } from "./questions/single-select-question";
import { TextQuestion } from "./questions/text-question";
import { TextareaQuestion } from "./questions/textarea-question";

function readSingleSelectValue(
  answer: SerializedAnswer | undefined,
): SingleSelectAnswerValue {
  const candidate = answer?.valueJson;

  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return { choice: null };
  }

  const choice =
    "choice" in candidate && typeof candidate.choice === "string"
      ? candidate.choice
      : null;
  const otherText =
    "otherText" in candidate && typeof candidate.otherText === "string"
      ? candidate.otherText
      : undefined;

  return {
    choice,
    ...(otherText ? { otherText } : {}),
  };
}

function readMultiSelectValue(
  answer: SerializedAnswer | undefined,
): MultiSelectAnswerValue {
  const candidate = answer?.valueJson;

  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return { choices: [] };
  }

  const choices =
    "choices" in candidate && Array.isArray(candidate.choices)
      ? candidate.choices.filter(
          (choice): choice is string => typeof choice === "string",
        )
      : [];
  const otherText =
    "otherText" in candidate && typeof candidate.otherText === "string"
      ? candidate.otherText
      : undefined;

  return {
    choices,
    ...(otherText ? { otherText } : {}),
  };
}

export function QuestionRenderer({
  answer,
  invalid,
  onChange,
  onSingleSelectCommit,
  question,
}: {
  answer: SerializedAnswer | undefined;
  invalid: boolean;
  onChange: (next: {
    valueText: string | null;
    valueJson: JsonValue | null;
  }) => void;
  onSingleSelectCommit?: () => void;
  question: SurveyQuestion;
}) {
  const containerClass = [
    "space-y-4 border px-4 py-4 sm:px-5 sm:py-5",
    invalid ? "survey-error" : "border-border bg-[var(--panel)]",
  ].join(" ");

  return (
    <div className={containerClass} id={`question-${question.id}`}>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-lg leading-7 font-medium tracking-[-0.02em] text-foreground">
            {question.prompt}
          </h3>
          {question.required ? (
            <span className="survey-pill px-2.5 py-1 text-[0.66rem] uppercase tracking-[0.24em]">
              Obligatoria
            </span>
          ) : null}
        </div>

        {question.helpText ? (
          <p className="survey-muted max-w-2xl text-sm leading-6">
            {question.helpText}
          </p>
        ) : null}

        {invalid ? (
          <p className="text-sm leading-6 text-[var(--danger-foreground)]">
            Este campo es obligatorio para continuar.
          </p>
        ) : null}
      </div>

      {question.questionType === "long_text" ? (
        <TextareaQuestion
          onChange={(value) => onChange({ valueText: value, valueJson: null })}
          question={question}
          value={answer?.valueText ?? ""}
        />
      ) : null}

      {question.questionType === "short_text" ||
      question.questionType === "email" ||
      question.questionType === "phone" ? (
        <TextQuestion
          onChange={(value) => onChange({ valueText: value, valueJson: null })}
          question={question}
          value={answer?.valueText ?? ""}
        />
      ) : null}

      {question.questionType === "single_select" ? (
        <SingleSelectQuestion
          onChange={(value) => {
            onChange({
              valueText: null,
              valueJson: value as unknown as JsonValue,
            });

            onSingleSelectCommit?.();
          }}
          question={question}
          value={readSingleSelectValue(answer)}
        />
      ) : null}

      {question.questionType === "multi_select" ? (
        <MultiSelectQuestion
          onChange={(value) =>
            onChange({
              valueText: null,
              valueJson: value as unknown as JsonValue,
            })
          }
          question={question}
          value={readMultiSelectValue(answer)}
        />
      ) : null}
    </div>
  );
}
