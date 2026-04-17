"use client";

import type { ChatStatus } from "ai";
import { Loader2Icon, SendIcon, SquareIcon } from "lucide-react";
import type {
  ComponentProps,
  FormEvent,
  KeyboardEvent,
  ReactNode,
} from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type PromptInputMessage = { text: string };

export type PromptInputProps = Omit<ComponentProps<"form">, "onSubmit"> & {
  onSubmit: (message: PromptInputMessage) => void;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  status: ChatStatus;
  onStop?: () => void;
  disabled?: boolean;
  footer?: ReactNode;
};

export function PromptInput({
  className,
  onSubmit,
  value,
  onValueChange,
  placeholder = "Escribe tu respuesta...",
  status,
  onStop,
  disabled,
  footer,
  ...props
}: PromptInputProps) {
  const isStreaming =
    status === ("streaming" as ChatStatus) ||
    status === ("submitted" as ChatStatus);
  const canSubmit = value.trim().length > 0 && !isStreaming && !disabled;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    onSubmit({ text: value.trim() });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (canSubmit) {
        onSubmit({ text: value.trim() });
      }
    }
  }

  return (
    <form
      className={cn(
        "survey-surface flex flex-col gap-2 rounded-[14px] border border-border bg-[var(--panel)] p-2",
        className,
      )}
      onSubmit={handleSubmit}
      {...props}
    >
      <Textarea
        autoFocus
        className="min-h-[56px] max-h-[160px] resize-none border-0 bg-transparent px-2 py-1 text-sm leading-6 shadow-none focus-visible:ring-0 dark:bg-transparent"
        disabled={disabled || isStreaming}
        onChange={(event) => onValueChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        value={value}
      />
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="survey-muted text-[0.7rem] uppercase tracking-[0.22em]">
          {footer ?? <span>Enter para enviar</span>}
        </div>
        {isStreaming ? (
          <Button
            onClick={() => onStop?.()}
            size="icon"
            type="button"
            variant="outline"
          >
            <SquareIcon className="size-3.5" />
          </Button>
        ) : (
          <Button
            aria-label="Enviar"
            disabled={!canSubmit}
            size="icon"
            type="submit"
          >
            {status === "submitted" ? (
              <Loader2Icon className="size-3.5 animate-spin" />
            ) : (
              <SendIcon className="size-3.5" />
            )}
          </Button>
        )}
      </div>
    </form>
  );
}
