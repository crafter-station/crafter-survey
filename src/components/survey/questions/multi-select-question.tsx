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
  const useCompactLayout = question.ui?.variant === "chips";
  const allowsSelectedText = question.options.some(
    (option) => value.choices.includes(option.key) && option.meta?.allowsText,
  );

  return (
    <div className="space-y-2.5">
      {maxSelections ? (
        <p className="survey-kicker text-xs uppercase tracking-[0.18em]">
          {value.choices.length}/{maxSelections} seleccionadas
        </p>
      ) : null}

      <div className={useCompactLayout ? "flex flex-wrap gap-2" : "grid gap-2.5 sm:grid-cols-2"}>
        {question.options.map((option) => {
          const selected = value.choices.includes(option.key);

          const toggleOption = () => {
            if (disabled) {
              return;
            }

            if (selected) {
              onChange({
                choices: value.choices.filter((choice) => choice !== option.key),
                ...(option.meta?.allowsText
                  ? { otherText: "" }
                  : value.otherText
                    ? { otherText: value.otherText }
                    : {}),
              });

              return;
            }

            if (maxSelections && value.choices.length >= maxSelections) {
              return;
            }

            onChange({
              choices: [...value.choices, option.key],
              ...(value.otherText ? { otherText: value.otherText } : {}),
            });
          };

          return (
            <div
              className={[
                useCompactLayout
                  ? "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors"
                  : "survey-option",
                disabled ? "cursor-default" : "cursor-pointer",
                selected
                  ? useCompactLayout
                    ? "border-foreground bg-foreground text-background"
                    : "survey-option-selected"
                  : useCompactLayout
                    ? "border-border hover:border-foreground/50"
                    : "",
              ].join(" ")}
              onClick={toggleOption}
              key={option.id}
              role="button"
              tabIndex={disabled ? -1 : 0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleOption();
                }
              }}
            >
              <div className={[
                "pointer-events-none",
                useCompactLayout
                  ? "flex items-center gap-2"
                  : "flex w-full items-start justify-between gap-2.5"
              ].join(" ")}>
                {useCompactLayout ? (
                  <>
                    {selected && <span className="text-xs">✓</span>}
                    <span>{option.label}</span>
                  </>
                ) : (
                  <>
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
                      className="mt-1 rounded-none border-border bg-background text-primary pointer-events-none"
                      disabled={disabled}
                      id={`${question.id}-${option.key}`}
                    />
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {allowsSelectedText ? (
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
            readUiString(question, "additionalTextPlaceholder") ??
            readUiString(question, "otherInputPlaceholder") ??
            "Cuéntanos más"
          }
          type="text"
          value={value.otherText ?? ""}
        />
      ) : null}
    </div>
  );
}
