import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SurveyShell({
  children,
  chrome,
  compact = false,
}: {
  children: ReactNode;
  chrome?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <div
        className={cn(
          "relative z-10 mx-auto flex min-h-screen w-full max-w-[1040px] flex-col px-4 sm:px-6 lg:px-8",
          compact ? "py-3 sm:py-4" : "py-6 sm:py-8",
        )}
      >
        {chrome ? (
          <div
            className={cn(
              "mx-auto w-full max-w-4xl",
              compact ? "mb-3 sm:mb-4" : "mb-6 sm:mb-8",
            )}
          >
            {chrome}
          </div>
        ) : null}

        <div
          className={cn(
            "survey-surface mx-auto w-full max-w-4xl",
            compact ? "flex min-h-0 flex-1 flex-col" : undefined,
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
