import type { HTMLAttributes } from "react";

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
  question,
  value,
  onChange,
}: {
  question: SurveyQuestion;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      autoComplete={readUiString(question, "autoComplete")}
      className="survey-input"
      inputMode={readInputMode(question)}
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
