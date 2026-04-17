import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
    <div className="space-y-2.5">
      <RadioGroup
        className="grid gap-2.5 sm:grid-cols-2"
        onValueChange={(nextValue) => {
          if (!nextValue) {
            return;
          }

          const option = question.options.find(
            (item) => item.key === nextValue,
          );

          onChange({
            choice: nextValue,
            ...(option?.meta?.allowsText
              ? { otherText: value.otherText ?? "" }
              : {}),
          });
        }}
        value={value.choice ?? ""}
      >
        {question.options.map((option) => {
          const selected = value.choice === option.key;

          return (
            <div
              className={[
                "survey-option cursor-pointer",
                selected ? "survey-option-selected" : "",
              ].join(" ")}
              key={option.id}
            >
              <label
                className="flex cursor-pointer items-start justify-between gap-2.5"
                htmlFor={`${question.id}-${option.key}`}
              >
                <div className="space-y-1">
                  <p className="text-base leading-6 text-foreground">
                    {option.label}
                  </p>
                  {option.helpText ? (
                    <p className="survey-muted text-sm">{option.helpText}</p>
                  ) : null}
                </div>
                <RadioGroupItem
                  className="mt-1 border-border bg-background text-primary"
                  id={`${question.id}-${option.key}`}
                  value={option.key}
                />
              </label>
            </div>
          );
        })}
      </RadioGroup>

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
