import type { ReactNode } from "react";

import { CrafterIcon } from "@/components/icons/crafter";
import { ThemeToggle } from "@/components/theme-toggle";

export function SurveyShell({
  children,
  footer,
  panelDescription,
  panelEyebrow,
  panelTitle,
  progressValue,
  surveyDescription,
  surveyTitle,
}: {
  children: ReactNode;
  footer?: ReactNode;
  panelDescription: string | null;
  panelEyebrow: string;
  panelTitle: string;
  progressValue: number;
  surveyDescription: string | null;
  surveyTitle: string;
}) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1040px] flex-col px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <header className="mx-auto w-full max-w-4xl space-y-3 pt-4 sm:pt-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CrafterIcon className="h-3.5 w-3.5 text-foreground sm:h-4 sm:w-4" />
              <p className="survey-kicker text-[0.69rem] uppercase tracking-[0.28em]">
                Crafter Station
              </p>
            </div>
            <ThemeToggle />
          </div>
          <h1 className="survey-heading max-w-4xl text-4xl leading-none font-medium tracking-[-0.045em] text-foreground sm:text-5xl lg:text-6xl">
            {surveyTitle}
          </h1>
          {surveyDescription ? (
            <div className="survey-body survey-muted max-w-3xl text-base leading-8 whitespace-pre-line">
              {surveyDescription}
            </div>
          ) : null}
        </header>

        <div className="survey-surface mx-auto w-full max-w-4xl">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="survey-kicker flex items-center justify-between gap-4 text-[0.69rem] uppercase tracking-[0.26em]">
                <span>{panelEyebrow}</span>
                <span>{Math.round(progressValue * 100)}%</span>
              </div>
              <div className="survey-progress-track h-[2px] overflow-hidden">
                <div
                  className="survey-progress-fill h-full transition-[width] duration-300 ease-out"
                  style={{ width: `${Math.max(progressValue, 0.04) * 100}%` }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <h2 className="survey-heading max-w-3xl text-2xl leading-tight font-medium tracking-[-0.03em] text-foreground sm:text-3xl">
                {panelTitle}
              </h2>
              {panelDescription ? (
                <p className="survey-body survey-muted max-w-2xl text-base leading-7">
                  {panelDescription}
                </p>
              ) : null}
            </div>

            <div>{children}</div>

            {footer ? <div>{footer}</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
