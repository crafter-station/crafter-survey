import type { SurveyQuestion } from "@/types/survey";

function getMaxLength(question: SurveyQuestion) {
  const value = question.validation?.maxLength;

  return typeof value === "number" ? value : undefined;
}

export function TextareaQuestion({
  question,
  value,
  onChange,
}: {
  question: SurveyQuestion;
  value: string;
  onChange: (value: string) => void;
}) {
  const maxLength = getMaxLength(question);

  return (
    <div className="space-y-3">
      <textarea
        className="survey-input min-h-32 resize-y"
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        placeholder={question.placeholder ?? ""}
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
