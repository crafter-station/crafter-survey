import { CrafterIcon } from "@/components/icons/crafter";
import { ThemeToggle } from "@/components/theme-toggle";

export function SurveyHeroChrome({
  surveyDescription,
  surveyTitle,
}: {
  surveyDescription: string | null;
  surveyTitle: string;
}) {
  return (
    <header className="space-y-3 pt-4 sm:pt-6">
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
  );
}
