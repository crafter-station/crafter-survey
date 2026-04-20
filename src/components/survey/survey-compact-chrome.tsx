import type { ReactNode } from "react";

import { CrafterIcon } from "@/components/icons/crafter";
import { ThemeToggle } from "@/components/theme-toggle";

export function SurveyCompactChrome({ actions }: { actions?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <CrafterIcon className="h-3.5 w-3.5 text-foreground" />
        <p className="survey-kicker hidden text-[0.66rem] uppercase tracking-[0.24em] text-muted-foreground sm:block">
          Crafter Station
        </p>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {actions ? actions : null}
        <ThemeToggle />
      </div>
    </div>
  );
}
