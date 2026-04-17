import { Button } from "@/components/ui/button";

interface ProgressNavProps {
  canGoBack: boolean;
  currentSectionIndex: number;
  isBusy: boolean;
  isLastSection: boolean;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
  saveLabel: string;
  totalSections: number;
}

export function ProgressNav({
  canGoBack,
  currentSectionIndex,
  isBusy,
  isLastSection,
  onBack,
  onNext,
  onSubmit,
  saveLabel,
  totalSections,
}: ProgressNavProps) {
  return (
    <div className="flex flex-col gap-4 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <p className="survey-kicker text-[0.69rem] uppercase tracking-[0.26em]">
          Sección {currentSectionIndex + 1} de {totalSections}
        </p>
        <p className="survey-muted text-sm">{saveLabel}</p>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          disabled={!canGoBack || isBusy}
          onClick={onBack}
        >
          Atrás
        </Button>

        {isLastSection ? (
          <Button disabled={isBusy} onClick={onSubmit}>
            {isBusy ? "Enviando..." : "Enviar respuestas"}
          </Button>
        ) : (
          <Button disabled={isBusy} onClick={onNext}>
            {isBusy ? "Guardando..." : "Siguiente"}
          </Button>
        )}
      </div>
    </div>
  );
}
