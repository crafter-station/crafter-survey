import type { HTMLAttributes, Ref } from "react";

import { Input } from "@/components/ui/input";
import type { SurveyQuestion } from "@/types/survey";

function readUiString(
  question: SurveyQuestion,
  key: keyof NonNullable<SurveyQuestion["ui"]>,
) {
  const value = question.ui?.[key];

  return typeof value === "string" ? value : undefined;
}

function readInputMode(
  question: SurveyQuestion,
): HTMLAttributes<HTMLInputElement>["inputMode"] {
  const value = readUiString(question, "inputMode");

  switch (value) {
    case "decimal":
    case "email":
    case "none":
    case "numeric":
    case "search":
    case "tel":
    case "text":
    case "url":
      return value;
    default:
      return undefined;
  }
}

export function TextQuestion({
  disabled = false,
  inputRef,
  question,
  value,
  onChange,
}: {
  disabled?: boolean;
  inputRef?: Ref<HTMLInputElement>;
  question: SurveyQuestion;
  value: string;
  onChange: (value: string) => void;
}) {
  const maxLength = question.validation?.maxLength;

  return (
    <Input
      autoComplete={readUiString(question, "autoComplete")}
      className="survey-input h-auto px-3 py-2.5 md:text-sm"
      disabled={disabled}
      inputMode={readInputMode(question)}
      maxLength={typeof maxLength === "number" ? maxLength : undefined}
      ref={inputRef}
      onChange={(event) => onChange(event.target.value)}
      placeholder={question.placeholder ?? ""}
      type={
        question.questionType === "email"
          ? "email"
          : question.questionType === "phone"
            ? "tel"
            : "text"
      }
      value={value}
    />
  );
}
