"use client";

import { CheckIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { SurveyOption, SurveyQuestion } from "@/types/survey";

export function ChatQuestionPicker({
  question,
  disabled,
  onSubmit,
  onSkip,
}: {
  question: SurveyQuestion;
  disabled?: boolean;
  onSubmit: (value: string) => void;
  onSkip?: () => void;
}) {
  switch (question.questionType) {
    case "single_select":
      return (
        <SingleSelectPicker
          disabled={disabled}
          onSubmit={onSubmit}
          question={question}
        />
      );
    case "multi_select":
      return (
        <MultiSelectPicker
          disabled={disabled}
          onSubmit={onSubmit}
          question={question}
        />
      );
    case "long_text":
      return (
        <LongTextPicker
          disabled={disabled}
          onSkip={onSkip}
          onSubmit={onSubmit}
          question={question}
        />
      );
    default:
      return (
        <ShortTextPicker
          disabled={disabled}
          onSkip={onSkip}
          onSubmit={onSubmit}
          question={question}
        />
      );
  }
}

function renderOtherField({
  option,
  value,
  onChange,
  disabled,
}: {
  option: SurveyOption;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <Input
      className="mt-2"
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      placeholder={
        typeof option.meta === "object" && option.meta
          ? "Cuéntanos más..."
          : "Cuéntanos más..."
      }
      value={value}
    />
  );
}

function SingleSelectPicker({
  question,
  disabled,
  onSubmit,
}: {
  question: SurveyQuestion;
  disabled?: boolean;
  onSubmit: (value: string) => void;
}) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [otherText, setOtherText] = useState("");

  const selected = useMemo(
    () => question.options.find((option) => option.key === selectedKey) ?? null,
    [question.options, selectedKey],
  );
  const requiresOther = Boolean(selected?.meta?.allowsText);
  const canSubmit = Boolean(
    selected && (!requiresOther || otherText.trim().length > 0),
  );

  function submit() {
    if (!selected || disabled) return;
    const extra =
      requiresOther && otherText.trim() ? ` — ${otherText.trim()}` : "";
    onSubmit(`Elijo: ${selected.label}${extra}`);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {question.options.map((option) => {
          const isSelected = option.key === selectedKey;
          return (
            <button
              className={cn(
                "survey-kicker rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.18em] transition-colors",
                isSelected
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-[var(--panel)] hover:border-foreground/50",
              )}
              disabled={disabled}
              key={option.key}
              onClick={() => setSelectedKey(option.key)}
              type="button"
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {requiresOther && selected
        ? renderOtherField({
            disabled,
            onChange: setOtherText,
            option: selected,
            value: otherText,
          })
        : null}
      <div className="flex items-center justify-end gap-2 pt-1">
        <Button
          disabled={!canSubmit || disabled}
          onClick={submit}
          size="sm"
          type="button"
        >
          <CheckIcon className="size-3.5" />
          Enviar
        </Button>
      </div>
    </div>
  );
}

function MultiSelectPicker({
  question,
  disabled,
  onSubmit,
}: {
  question: SurveyQuestion;
  disabled?: boolean;
  onSubmit: (value: string) => void;
}) {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [otherText, setOtherText] = useState("");

  const maxSelections = question.validation?.maxSelections ?? null;
  const otherOption = useMemo(
    () =>
      question.options.find((option) =>
        selectedKeys.has(option.key) ? option.meta?.allowsText : false,
      ),
    [question.options, selectedKeys],
  );
  const requiresOther = Boolean(otherOption);
  const canSubmit =
    selectedKeys.size > 0 &&
    (!requiresOther || otherText.trim().length > 0) &&
    (!maxSelections || selectedKeys.size <= maxSelections);

  function toggle(key: string) {
    setSelectedKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        if (maxSelections && next.size >= maxSelections) {
          return current;
        }
        next.add(key);
      }
      return next;
    });
  }

  function submit() {
    if (!canSubmit || disabled) return;
    const labels = question.options
      .filter((option) => selectedKeys.has(option.key))
      .map((option) => option.label);
    const extra =
      requiresOther && otherText.trim() ? ` — ${otherText.trim()}` : "";
    onSubmit(`Elijo: ${labels.join(", ")}${extra}`);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid gap-1.5">
        {question.options.map((option) => {
          const isSelected = selectedKeys.has(option.key);
          return (
            <button
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors",
                isSelected
                  ? "border-foreground bg-foreground/5"
                  : "border-border bg-[var(--panel)] hover:border-foreground/40",
              )}
              disabled={disabled}
              key={option.key}
              onClick={() => toggle(option.key)}
              type="button"
            >
              <Checkbox
                checked={isSelected}
                disabled={disabled}
                tabIndex={-1}
              />
              <span className="flex-1">{option.label}</span>
            </button>
          );
        })}
      </div>
      {requiresOther && otherOption
        ? renderOtherField({
            disabled,
            onChange: setOtherText,
            option: otherOption,
            value: otherText,
          })
        : null}
      <div className="flex items-center justify-between pt-1">
        <span className="survey-muted text-xs">
          {selectedKeys.size}
          {maxSelections ? `/${maxSelections}` : ""} seleccionadas
        </span>
        <Button
          disabled={!canSubmit || disabled}
          onClick={submit}
          size="sm"
          type="button"
        >
          <CheckIcon className="size-3.5" />
          Enviar
        </Button>
      </div>
    </div>
  );
}

function ShortTextPicker({
  question,
  disabled,
  onSubmit,
  onSkip,
}: {
  question: SurveyQuestion;
  disabled?: boolean;
  onSubmit: (value: string) => void;
  onSkip?: () => void;
}) {
  const [value, setValue] = useState("");

  const canSubmit = value.trim().length > 0;

  function submit() {
    if (!canSubmit || disabled) return;
    onSubmit(value.trim());
  }

  return (
    <div className="flex flex-col gap-2">
      <Input
        autoFocus
        disabled={disabled}
        inputMode={
          question.questionType === "email"
            ? "email"
            : question.questionType === "phone"
              ? "tel"
              : "text"
        }
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && canSubmit) {
            event.preventDefault();
            submit();
          }
        }}
        placeholder={question.placeholder ?? "Tu respuesta..."}
        value={value}
      />
      <div className="flex items-center justify-end gap-2">
        {!question.required && onSkip ? (
          <Button
            disabled={disabled}
            onClick={onSkip}
            size="sm"
            type="button"
            variant="ghost"
          >
            Saltar
          </Button>
        ) : null}
        <Button
          disabled={!canSubmit || disabled}
          onClick={submit}
          size="sm"
          type="button"
        >
          <CheckIcon className="size-3.5" />
          Enviar
        </Button>
      </div>
    </div>
  );
}

function LongTextPicker({
  question,
  disabled,
  onSubmit,
  onSkip,
}: {
  question: SurveyQuestion;
  disabled?: boolean;
  onSubmit: (value: string) => void;
  onSkip?: () => void;
}) {
  const [value, setValue] = useState("");

  const maxLength = question.validation?.maxLength ?? undefined;
  const canSubmit = value.trim().length > 0;

  function submit() {
    if (!canSubmit || disabled) return;
    onSubmit(value.trim());
  }

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        autoFocus
        className="min-h-[88px]"
        disabled={disabled}
        maxLength={maxLength}
        onChange={(event) => setValue(event.target.value)}
        placeholder={question.placeholder ?? "Escribe aquí..."}
        value={value}
      />
      <div className="flex items-center justify-between">
        <span className="survey-muted text-xs">
          {maxLength ? `${value.length}/${maxLength}` : null}
        </span>
        <div className="flex items-center gap-2">
          {!question.required && onSkip ? (
            <Button
              disabled={disabled}
              onClick={onSkip}
              size="sm"
              type="button"
              variant="ghost"
            >
              Saltar
            </Button>
          ) : null}
          <Button
            disabled={!canSubmit || disabled}
            onClick={submit}
            size="sm"
            type="button"
          >
            <CheckIcon className="size-3.5" />
            Enviar
          </Button>
        </div>
      </div>
    </div>
  );
}
