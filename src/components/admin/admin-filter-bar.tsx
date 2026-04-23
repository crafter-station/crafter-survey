"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";

type Option = { value: string; label: string };

export function AdminFilterBar({
  surveyOptions,
  versionOptions,
  selectedSurvey,
  selectedVersion,
  basePath = "/admin/overview",
  includeDrafts = false,
  showIncludeDraftsToggle = false,
}: {
  surveyOptions: Option[];
  versionOptions: Option[];
  selectedSurvey: string | null;
  selectedVersion: string | null;
  basePath?: string;
  includeDrafts?: boolean;
  showIncludeDraftsToggle?: boolean;
}) {
  const createHref = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(window.location.search);

    for (const [key, value] of Object.entries(updates)) {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }

    const queryString = params.toString();

    return queryString ? `${basePath}?${queryString}` : basePath;
  };

  const surveyHref = (value: string) =>
    createHref({
      survey: value,
      version: null,
      question: null,
    });
  const versionHref =
    selectedSurvey && selectedVersion
      ? (value: string) =>
          createHref({
            survey: selectedSurvey,
            version: value,
            question: null,
          })
      : null;
  const includeDraftsHref = (checked: boolean) =>
    createHref({ includeDrafts: checked ? "1" : null });
  const includeDraftsControlId = `${basePath.replace(/\//g, "-") || "admin"}-include-drafts`;

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
          <div className="survey-input text-sm text-muted-foreground">
            No versions
          </div>
        )}
      </div>
      {showIncludeDraftsToggle ? (
        <div className="space-y-1 md:col-span-2">
          <p className="survey-kicker text-[0.64rem] uppercase tracking-[0.18em] text-muted-foreground">
            Responses
          </p>
          <label
            className="flex items-center gap-3 rounded-[18px] border border-border/70 bg-card/70 px-4 py-3 text-sm"
            htmlFor={includeDraftsControlId}
          >
            <Checkbox
              checked={includeDrafts}
              id={includeDraftsControlId}
              onCheckedChange={(checked) => {
                window.location.href = includeDraftsHref(Boolean(checked));
              }}
            />
            <span>Include draft responses</span>
          </label>
        </div>
      ) : null}
    </div>
  );
}
