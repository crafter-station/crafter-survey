import type { SingleSelectAnswerValue, SurveyQuestion } from "@/types/survey";

function readUiString(
  question: SurveyQuestion,
  key: keyof NonNullable<SurveyQuestion["ui"]>,
) {
  const value = question.ui?.[key];

  return typeof value === "string" ? value : undefined;
}

export function SingleSelectQuestion({
  question,
  value,
  onChange,
}: {
  question: SurveyQuestion;
  value: SingleSelectAnswerValue;
  onChange: (value: SingleSelectAnswerValue) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {question.options.map((option) => {
          const selected = value.choice === option.key;

          return (
            <label
              className={[
                "survey-option cursor-pointer",
                selected ? "survey-option-selected" : "",
              ].join(" ")}
              key={option.id}
            >
              <input
                checked={selected}
                className="sr-only"
                name={question.id}
                onChange={() =>
                  onChange({
                    choice: option.key,
                    ...(option.meta?.allowsText
                      ? { otherText: value.otherText ?? "" }
                      : {}),
                  })
                }
                type="radio"
              />
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-base leading-6 text-foreground">
                    {option.label}
                  </p>
                  {option.helpText ? (
                    <p className="survey-muted text-sm">{option.helpText}</p>
                  ) : null}
                </div>
                <span className="survey-choice-indicator mt-1 inline-flex h-4 w-4 shrink-0 border p-[3px]">
                  <span
                    className={[
                      "survey-choice-indicator-mark h-full w-full transition-opacity duration-150",
                      selected ? "opacity-100" : "opacity-0",
                    ].join(" ")}
                  />
                </span>
              </div>
            </label>
          );
        })}
      </div>

      {question.options.some(
        (option) => option.key === value.choice && option.meta?.allowsText,
      ) ? (
        <input
          className="survey-input"
          onChange={(event) =>
            onChange({
              choice: value.choice,
              otherText: event.target.value,
            })
          }
          placeholder={
            readUiString(question, "otherInputPlaceholder") ?? "Cuéntanos más"
          }
          type="text"
          value={value.otherText ?? ""}
        />
      ) : null}
    </div>
  );
}
