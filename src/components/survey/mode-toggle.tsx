"use client";

import { ListChecksIcon, MessagesSquareIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type SurveyMode = "chat" | "form";

export function SurveyModeToggle({
  mode,
  onChange,
}: {
  mode: SurveyMode;
  onChange: (mode: SurveyMode) => void;
}) {
  return (
    <div
      className="survey-surface inline-flex items-center rounded-full border border-border bg-[var(--panel)] p-0.5 text-xs"
      role="tablist"
    >
      <ToggleButton
        active={mode === "chat"}
        label="Chat"
        onClick={() => onChange("chat")}
      >
        <MessagesSquareIcon className="size-3.5" />
      </ToggleButton>
      <ToggleButton
        active={mode === "form"}
        label="Formulario"
        onClick={() => onChange("form")}
      >
        <ListChecksIcon className="size-3.5" />
      </ToggleButton>
    </div>
  );
}

function ToggleButton({
  active,
  children,
  label,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-selected={active}
      className={cn(
        "survey-kicker inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.66rem] uppercase tracking-[0.16em] transition-colors sm:px-3",
        active
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:text-foreground",
      )}
      onClick={onClick}
      role="tab"
      type="button"
    >
      {children}
      <span className="sm:hidden">
        {label === "Formulario" ? "Form" : label}
      </span>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
