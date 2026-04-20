import type { ReactNode } from "react";

import { CrafterIcon } from "@/components/icons/crafter";
import { ThemeToggle } from "@/components/theme-toggle";

export function SurveyCompactChrome({ actions }: { actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center justify-between gap-3 sm:justify-start">
        <div className="flex items-center gap-2.5">
          <CrafterIcon className="h-3.5 w-3.5 text-foreground" />
          <p className="survey-kicker text-[0.66rem] uppercase tracking-[0.24em] text-muted-foreground">
            Crafter Station
          </p>
        </div>
        <div className="sm:hidden">
          <ThemeToggle />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 sm:justify-end">
        {actions ? actions : <div />}
        <div className="hidden sm:block">
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
