import type { Ref } from "react";

import { Textarea } from "@/components/ui/textarea";
import type { SurveyQuestion } from "@/types/survey";

function getMaxLength(question: SurveyQuestion) {
  const value = question.validation?.maxLength;

  return typeof value === "number" ? value : undefined;
}

export function TextareaQuestion({
  disabled = false,
  inputRef,
  question,
  value,
  onChange,
}: {
  disabled?: boolean;
  inputRef?: Ref<HTMLTextAreaElement>;
  question: SurveyQuestion;
  value: string;
  onChange: (value: string) => void;
}) {
  const maxLength = getMaxLength(question);

  return (
    <div className="space-y-3">
      <Textarea
        className="survey-input min-h-28 resize-y px-3 py-2.5 md:text-sm"
        disabled={disabled}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        placeholder={question.placeholder ?? ""}
        ref={inputRef}
        value={value}
      />
      {maxLength ? (
        <p className="survey-kicker text-right text-xs tracking-[0.18em] uppercase">
          {value.length}/{maxLength}
        </p>
      ) : null}
    </div>
  );
}
