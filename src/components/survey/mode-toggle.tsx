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
      className="inline-flex items-center rounded-full border border-border/70 bg-background/70 p-1 text-xs shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl"
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
        "survey-kicker inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[0.64rem] uppercase tracking-[0.16em] transition-all sm:px-3",
        active
          ? "bg-foreground text-background shadow-sm"
          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
      )}
      onClick={onClick}
      role="tab"
      type="button"
    >
      {children}
      <span className="sr-only">{label === "Formulario" ? "Form" : label}</span>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
