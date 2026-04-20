"use client";

import { ArrowDownIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { useCallback } from "react";
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ConversationProps = ComponentProps<typeof StickToBottom>;

export function Conversation({ className, ...props }: ConversationProps) {
  return (
    <StickToBottom
      className={cn(
        "relative flex-1 overflow-y-auto overscroll-contain",
        className,
      )}
      initial="smooth"
      resize="smooth"
      role="log"
      {...props}
    />
  );
}

export type ConversationContentProps = ComponentProps<
  typeof StickToBottom.Content
>;

export function ConversationContent({
  className,
  ...props
}: ConversationContentProps) {
  return (
    <StickToBottom.Content
      className={cn(
        "mx-auto flex w-full max-w-3xl flex-col gap-5 px-3 py-3 sm:gap-6 sm:p-6",
        className,
      )}
      {...props}
    />
  );
}

export type ConversationEmptyStateProps = ComponentProps<"div"> & {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
};

export function ConversationEmptyState({
  className,
  title = "Sin mensajes aún",
  description,
  icon,
  children,
  ...props
}: ConversationEmptyStateProps) {
  return (
    <div
      className={cn(
        "mx-auto flex size-full max-w-xl flex-col items-center justify-center gap-3 p-8 text-center",
        className,
      )}
      {...props}
    >
      {children ?? (
        <>
          {icon ? <div className="text-muted-foreground">{icon}</div> : null}
          <div className="space-y-1">
            <h3 className="survey-heading text-base font-medium">{title}</h3>
            {description ? (
              <p className="text-muted-foreground text-sm">{description}</p>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

export function ConversationScrollButton(props: ComponentProps<typeof Button>) {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();

  const handleScrollToBottom = useCallback(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  if (isAtBottom) return null;

  return (
    <Button
      className={cn(
        "absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border-border/70 bg-background/88 shadow-lg backdrop-blur-xl",
        props.className,
      )}
      onClick={handleScrollToBottom}
      size="icon"
      type="button"
      variant="outline"
      {...props}
    >
      <ArrowDownIcon className="size-4" />
    </Button>
  );
}
