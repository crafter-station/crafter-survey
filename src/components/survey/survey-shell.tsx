import type { ReactNode } from "react";

import { CrafterIcon } from "@/components/icons/crafter";

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
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[30rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.16),transparent_58%)] opacity-70 dark:opacity-80" />
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 hidden h-[18rem] w-full opacity-[0.12] mix-blend-overlay md:block dark:opacity-[0.22]"
        focusable="false"
        preserveAspectRatio="none"
        viewBox="0 0 1440 400"
      >
        <filter id="survey-grain">
          <feTurbulence
            baseFrequency="0.82"
            numOctaves="4"
            stitchTiles="stitch"
            type="fractalNoise"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect height="400" width="1440" filter="url(#survey-grain)" />
      </svg>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 hidden h-[20rem] opacity-[0.06] md:block dark:opacity-[0.09]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")",
          mixBlendMode: "overlay",
        }}
      />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-8 sm:px-8 sm:py-10 lg:px-12">
        <header className="max-w-3xl space-y-4 pt-6 sm:pt-8">
          <div className="flex items-center gap-3">
            <CrafterIcon className="h-3.5 w-3.5 text-foreground sm:h-4 sm:w-4" />
            <p className="survey-kicker text-[0.69rem] uppercase tracking-[0.28em]">
              Crafter Station
            </p>
          </div>
          <h1 className="max-w-4xl text-4xl leading-none font-medium tracking-[-0.045em] text-foreground sm:text-5xl lg:text-6xl">
            {surveyTitle}
          </h1>
          {surveyDescription ? (
            <div className="survey-muted max-w-3xl text-base leading-8 whitespace-pre-line">
              {surveyDescription}
            </div>
          ) : null}
        </header>

        <div className="survey-surface max-w-4xl">
          <div className="space-y-5">
            <div className="space-y-2">
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

            <div className="space-y-2">
              <h2 className="max-w-3xl text-2xl leading-tight font-medium tracking-[-0.03em] text-foreground sm:text-3xl">
                {panelTitle}
              </h2>
              {panelDescription ? (
                <p className="survey-muted max-w-2xl text-base leading-7">
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
