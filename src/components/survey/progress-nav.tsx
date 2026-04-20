import { Button } from "@/components/ui/button";

interface ProgressNavProps {
  canGoBack: boolean;
  canGoNext: boolean;
  currentSectionIndex: number;
  currentSectionId: string;
  isBusy: boolean;
  onBack: () => void;
  onJump: (sectionId: string) => void;
  onNext: () => void;
  onSubmit: () => void;
  saveLabel: string;
  sections: Array<{ id: string; title: string }>;
  totalSections: number;
}

export function ProgressNav({
  canGoBack,
  canGoNext,
  currentSectionIndex,
  currentSectionId,
  isBusy,
  onBack,
  onJump,
  onNext,
  onSubmit,
  saveLabel,
  sections,
  totalSections,
}: ProgressNavProps) {
  return (
    <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-2">
        <p className="survey-kicker text-[0.69rem] uppercase tracking-[0.26em]">
          Sección {currentSectionIndex + 1} de {totalSections}
        </p>
        <p className="survey-muted text-sm">{saveLabel}</p>
        <div className="flex flex-wrap gap-2 pt-1">
          {sections.map((section, index) => {
            const active = section.id === currentSectionId;

            return (
              <Button
                className="px-2.5 py-1.5 text-[0.62rem] tracking-[0.16em]"
                disabled={isBusy}
                key={section.id}
                onClick={() => onJump(section.id)}
                type="button"
                variant={active ? "default" : "secondary"}
              >
                {index + 1}. {section.title}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          className="px-2.5 py-2 text-[0.68rem] tracking-[0.18em]"
          variant="secondary"
          disabled={!canGoBack || isBusy}
          onClick={onBack}
        >
          Atrás
        </Button>

        <Button
          className="px-2.5 py-2 text-[0.68rem] tracking-[0.18em]"
          disabled={!canGoNext || isBusy}
          onClick={onNext}
        >
          {isBusy ? "Guardando..." : "Siguiente"}
        </Button>

        <Button
          className="px-2.5 py-2 text-[0.68rem] tracking-[0.18em]"
          disabled={isBusy}
          onClick={onSubmit}
        >
          {isBusy ? "Enviando..." : "Enviar ahora"}
        </Button>
      </div>
    </div>
  );
}
