import type { RefObject } from "react";

import { Card, CardContent } from "@/components/ui/card";
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
  inputRef,
  onChange,
  onSingleSelectCommit,
  question,
  readOnly = false,
}: {
  answer: SerializedAnswer | undefined;
  inputRef?: RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  onChange: (next: {
    valueText: string | null;
    valueJson: JsonValue | null;
  }) => void;
  onSingleSelectCommit?: () => void;
  question: SurveyQuestion;
  readOnly?: boolean;
}) {
  return (
    <Card
      className="space-y-3 bg-transparent px-0 py-0"
      id={`question-${question.id}`}
      size="sm"
    >
      <CardContent className="space-y-3 px-0">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="survey-heading text-lg leading-7 font-medium tracking-[-0.02em] text-foreground">
              {question.prompt}
            </h3>
          </div>

          {question.helpText ? (
            <p className="survey-body survey-muted max-w-2xl text-sm leading-6">
              {question.helpText}
            </p>
          ) : null}
        </div>

        {question.questionType === "long_text" ? (
          <TextareaQuestion
            disabled={readOnly}
            inputRef={inputRef}
            onChange={(value) =>
              onChange({ valueText: value, valueJson: null })
            }
            question={question}
            value={answer?.valueText ?? ""}
          />
        ) : null}

        {question.questionType === "short_text" ||
        question.questionType === "email" ||
        question.questionType === "phone" ? (
          <TextQuestion
            disabled={readOnly}
            inputRef={inputRef}
            onChange={(value) =>
              onChange({ valueText: value, valueJson: null })
            }
            question={question}
            value={answer?.valueText ?? ""}
          />
        ) : null}

        {question.questionType === "single_select" ? (
          <SingleSelectQuestion
            disabled={readOnly}
            onChange={(value) => {
              if (readOnly) {
                return;
              }

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
            disabled={readOnly}
            onChange={(value) => {
              if (readOnly) {
                return;
              }

              onChange({
                valueText: null,
                valueJson: value as unknown as JsonValue,
              });
            }}
            question={question}
            value={readMultiSelectValue(answer)}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
