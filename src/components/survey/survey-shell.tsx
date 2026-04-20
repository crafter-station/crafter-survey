import type { ReactNode, RefObject } from "react";
import { cn } from "@/lib/utils";

export function SurveyShell({
  children,
  chrome,
  footer,
  contentRef,
  contentClassName,
  contentScrollable = true,
  compact = false,
}: {
  children: ReactNode;
  chrome?: ReactNode;
  footer?: ReactNode;
  contentRef?: RefObject<HTMLDivElement | null>;
  contentClassName?: string;
  contentScrollable?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative w-full",
        compact ? "h-full overflow-hidden" : "h-full overflow-y-auto",
      )}
    >
      <div
        className={cn(
          "relative z-10 mx-auto flex w-full max-w-[1120px] flex-col",
          compact
            ? "h-full px-0 py-0 sm:px-6 sm:py-4 lg:px-8"
            : "min-h-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8",
        )}
      >
        {compact ? (
          <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col overflow-hidden rounded-none border-y border-border/70 bg-card/72 shadow-none backdrop-blur-xl sm:rounded-[30px] sm:border sm:shadow-[0_12px_48px_rgba(0,0,0,0.08)]">
            {chrome ? (
              <div className="shrink-0 border-b border-border/70 bg-background/84 px-4 py-3 backdrop-blur-xl supports-[backdrop-filter]:bg-background/72 sm:px-5 sm:py-4">
                {chrome}
              </div>
            ) : null}

            <div
              className={cn(
                "min-h-0 flex-1",
                contentScrollable ? "overflow-y-auto" : "overflow-hidden",
                contentClassName,
              )}
              ref={contentRef}
            >
              {children}
            </div>

            {footer ? (
              <div className="shrink-0 border-t border-border/70 bg-background/88 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl supports-[backdrop-filter]:bg-background/78 sm:px-5 sm:pt-4">
                {footer}
              </div>
            ) : null}
          </div>
        ) : (
          <>
            {chrome ? (
              <div className="mx-auto mb-6 w-full max-w-5xl sm:mb-8">
                {chrome}
              </div>
            ) : null}

            <div className="survey-surface mx-auto w-full max-w-4xl">
              {children}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
