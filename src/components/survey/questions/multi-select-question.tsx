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
  question,
  value,
  onChange,
}: {
  question: SurveyQuestion;
  value: MultiSelectAnswerValue;
  onChange: (value: MultiSelectAnswerValue) => void;
}) {
  const maxSelections = getMaxSelections(question);

  return (
    <div className="space-y-3">
      {maxSelections ? (
        <p className="survey-kicker text-xs uppercase tracking-[0.18em]">
          {value.choices.length}/{maxSelections} seleccionadas
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {question.options.map((option) => {
          const selected = value.choices.includes(option.key);

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
                onChange={() => {
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
                    ...(value.otherText ? { otherText: value.otherText } : {}),
                  });
                }}
                type="checkbox"
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
        (option) =>
          value.choices.includes(option.key) && option.meta?.allowsText,
      ) ? (
        <input
          className="survey-input"
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
