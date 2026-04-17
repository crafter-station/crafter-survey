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
      className="survey-surface inline-flex items-center rounded-full border border-border bg-[var(--panel)] p-1 text-xs"
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
        "survey-kicker inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 uppercase tracking-[0.2em] transition-colors",
        active
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:text-foreground",
      )}
      onClick={onClick}
      role="tab"
      type="button"
    >
      {children}
      {label}
    </button>
  );
}
