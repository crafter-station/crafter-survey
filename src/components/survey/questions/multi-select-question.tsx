import { Checkbox } from "@/components/ui/checkbox";
import type { MultiSelectAnswerValue, SurveyQuestion } from "@/types/survey";

function getMaxSelections(question: SurveyQuestion) {
  const value = question.validation?.maxSelections;

  return typeof value === "number" ? value : undefined;
}

function readUiString(
  question: SurveyQuestion,
  key: keyof NonNullable<SurveyQuestion["ui"]>,
) {
  const value = question.ui?.[key];

  return typeof value === "string" ? value : undefined;
}

export function MultiSelectQuestion({
  disabled = false,
  question,
  value,
  onChange,
}: {
  disabled?: boolean;
  question: SurveyQuestion;
  value: MultiSelectAnswerValue;
  onChange: (value: MultiSelectAnswerValue) => void;
}) {
  const maxSelections = getMaxSelections(question);

  return (
    <div className="space-y-2.5">
      {maxSelections ? (
        <p className="survey-kicker text-xs uppercase tracking-[0.18em]">
          {value.choices.length}/{maxSelections} seleccionadas
        </p>
      ) : null}

      <div className="grid gap-2.5 sm:grid-cols-2">
        {question.options.map((option) => {
          const selected = value.choices.includes(option.key);

          return (
            <div
              className={[
                "survey-option",
                disabled ? "cursor-default" : "cursor-pointer",
                selected ? "survey-option-selected" : "",
              ].join(" ")}
              key={option.id}
            >
              <label
                className={[
                  "flex items-start justify-between gap-2.5",
                  disabled ? "cursor-default" : "cursor-pointer",
                ].join(" ")}
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
                <Checkbox
                  checked={selected}
                  className="mt-1 rounded-none border-border bg-background text-primary"
                  disabled={disabled}
                  id={`${question.id}-${option.key}`}
                  onCheckedChange={() => {
                    if (disabled) {
                      return;
                    }

                    if (selected) {
                      onChange({
                        choices: value.choices.filter(
                          (choice) => choice !== option.key,
                        ),
                        ...(option.meta?.allowsText
                          ? { otherText: "" }
                          : value.otherText
                            ? { otherText: value.otherText }
                            : {}),
                      });

                      return;
                    }

                    if (
                      maxSelections &&
                      value.choices.length >= maxSelections &&
                      !selected
                    ) {
                      return;
                    }

                    onChange({
                      choices: [...value.choices, option.key],
                      ...(value.otherText
                        ? { otherText: value.otherText }
                        : {}),
                    });
                  }}
                />
              </label>
            </div>
          );
        })}
      </div>

      {question.options.some(
        (option) =>
          value.choices.includes(option.key) && option.meta?.allowsText,
      ) ? (
        <input
          className="survey-input"
          disabled={disabled}
          onChange={(event) =>
            onChange({
              choices: value.choices,
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
