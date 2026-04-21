"use client";

import { Combobox } from "@/components/ui/combobox";

type Option = { value: string; label: string };

export function AdminFilterBar({
  surveyOptions,
  versionOptions,
  selectedSurvey,
  selectedVersion,
  basePath = "/admin/overview",
}: {
  surveyOptions: Option[];
  versionOptions: Option[];
  selectedSurvey: string | null;
  selectedVersion: string | null;
  basePath?: string;
}) {
  const surveyHref = (value: string) => `${basePath}?survey=${encodeURIComponent(value)}`;
  const versionHref =
    selectedSurvey && selectedVersion
      ? (value: string) =>
          `${basePath}?survey=${encodeURIComponent(selectedSurvey)}&version=${encodeURIComponent(value)}`
      : null;

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="space-y-1">
        <p className="survey-kicker text-[0.64rem] uppercase tracking-[0.18em] text-muted-foreground">
          Survey
        </p>
        <Combobox
          onChange={(value) => {
            window.location.href = surveyHref(value);
          }}
          options={surveyOptions}
          value={selectedSurvey}
        />
      </div>
      <div className="space-y-1">
        <p className="survey-kicker text-[0.64rem] uppercase tracking-[0.18em] text-muted-foreground">
          Version
        </p>
        {versionHref ? (
          <Combobox
            onChange={(value) => {
              window.location.href = versionHref(value);
            }}
            options={versionOptions}
            value={selectedVersion}
          />
        ) : (
          <div className="survey-input text-sm text-muted-foreground">No versions</div>
        )}
      </div>
    </div>
  );
}
