"use client";

import { ListIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";

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
  const [isSectionsOpen, setIsSectionsOpen] = useState(false);

  useEffect(() => {
    if (!isSectionsOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsSectionsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSectionsOpen]);

  return (
    <>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="survey-kicker text-[0.69rem] uppercase tracking-[0.26em] text-muted-foreground">
            Sección {currentSectionIndex + 1} de {totalSections}
          </p>
          <p className="survey-muted text-sm">{saveLabel}</p>
          <Button
            className="rounded-full px-3 py-2 text-[0.68rem] tracking-[0.16em]"
            disabled={isBusy}
            onClick={() => setIsSectionsOpen(true)}
            type="button"
            variant="outline"
          >
            <ListIcon className="size-3.5" />
            Secciones
          </Button>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <Button
            className="flex-1 rounded-full px-3 py-2 text-[0.68rem] tracking-[0.16em] sm:flex-none"
            variant="secondary"
            disabled={!canGoBack || isBusy}
            onClick={onBack}
          >
            Atrás
          </Button>

          <Button
            className="flex-1 rounded-full px-3 py-2 text-[0.68rem] tracking-[0.16em] sm:flex-none"
            disabled={!canGoNext || isBusy}
            onClick={onNext}
          >
            {isBusy ? "Guardando..." : "Siguiente"}
          </Button>

          <Button
            className="flex-1 rounded-full px-3 py-2 text-[0.68rem] tracking-[0.16em] sm:flex-none"
            disabled={isBusy}
            onClick={onSubmit}
          >
            {isBusy ? "Enviando..." : "Enviar ahora"}
          </Button>
        </div>
      </div>

      {isSectionsOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4">
          <button
            aria-label="Cerrar secciones"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsSectionsOpen(false)}
            type="button"
          />
          <div
            className="relative w-full max-w-md rounded-[28px] border border-border/70 bg-background p-4 shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Secciones del survey"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="survey-kicker text-[0.64rem] uppercase tracking-[0.18em] text-muted-foreground">
                  Secciones
                </p>
                <p className="survey-muted mt-1 text-sm">
                  Salta directo a cualquier bloque del survey.
                </p>
              </div>
              <Button
                aria-label="Cerrar secciones"
                className="rounded-full"
                onClick={() => setIsSectionsOpen(false)}
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <XIcon className="size-3.5" />
              </Button>
            </div>

            <div className="mt-4 max-h-[60dvh] space-y-2 overflow-y-auto pr-1">
              {sections.map((section, index) => {
                const isCurrent = section.id === currentSectionId;

                return (
                  <button
                    className={[
                      "flex w-full items-center justify-between rounded-[20px] border px-4 py-3 text-left transition-colors",
                      isCurrent
                        ? "border-foreground/20 bg-foreground text-background"
                        : "border-border/70 bg-card/70 text-foreground hover:bg-accent/60",
                    ].join(" ")}
                    key={section.id}
                    onClick={() => {
                      setIsSectionsOpen(false);
                      if (section.id !== currentSectionId) {
                        onJump(section.id);
                      }
                    }}
                    type="button"
                  >
                    <span className="text-sm leading-6">
                      {index + 1}. {section.title}
                    </span>
                    <span className="survey-kicker text-[0.58rem] uppercase tracking-[0.16em] opacity-75">
                      {isCurrent ? "Actual" : "Ir"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
