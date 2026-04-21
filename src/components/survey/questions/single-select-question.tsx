import { Combobox } from "@/components/ui/combobox";
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
  disabled = false,
  question,
  value,
  onChange,
}: {
  disabled?: boolean;
  question: SurveyQuestion;
  value: SingleSelectAnswerValue;
  onChange: (value: SingleSelectAnswerValue) => void;
}) {
  const useCombobox = question.ui?.variant === "combobox";

  // Render combobox variant
  if (useCombobox) {
    const placeholderText =
      question.key === "country"
        ? "Busca tu país..."
        : "Selecciona una opción...";

    return (
      <div className="space-y-2.5">
        <Combobox
          disabled={disabled}
          onChange={(nextValue) => {
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
          options={question.options.map((opt) => ({
            value: opt.key,
            label: opt.label,
          }))}
          placeholder={placeholderText}
          value={value.choice ?? null}
        />

        {question.options.some(
          (option) => option.key === value.choice && option.meta?.allowsText,
        ) ? (
          <input
            className="survey-input"
            disabled={disabled}
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

  // Render default radio button variant
  return (
    <div className="space-y-2.5">
      <RadioGroup
        className="grid gap-2.5 sm:grid-cols-2"
        onValueChange={(nextValue) => {
          if (disabled) {
            return;
          }

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
                "survey-option",
                disabled ? "cursor-default" : "cursor-pointer",
                selected ? "survey-option-selected" : "",
              ].join(" ")}
              onClick={() => {
                if (disabled || selected) {
                  return;
                }

                onChange({
                  choice: option.key,
                  ...(option.meta?.allowsText
                    ? { otherText: value.otherText ?? "" }
                    : {}),
                });
              }}
              key={option.id}
            >
              <label
                className={[
                  "flex w-full items-start justify-between gap-2.5",
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
                <RadioGroupItem
                  className="mt-1 border-border bg-background text-primary"
                  disabled={disabled}
                  id={`${question.id}-${option.key}`}
                  onClick={(event) => event.stopPropagation()}
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
          disabled={disabled}
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
