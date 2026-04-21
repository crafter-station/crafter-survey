import { AdminFilterBar } from "@/components/admin/admin-filter-bar";
import { AdminShell } from "@/components/admin/admin-shell";
import { MetricCard } from "@/components/admin/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { parseAdminFilters } from "@/lib/admin/filters";
import { getOverviewReport } from "@/lib/admin/reports";

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseAdminFilters(await searchParams);
  const report = await getOverviewReport(filters);

  return (
    <AdminShell currentPath="/admin/overview" title="Survey analytics overview">
      {report ? (
        <div className="space-y-6">
          <AdminFilterBar
            selectedSurvey={report.scope.survey.slug}
            selectedVersion={report.scope.version.id}
            surveyOptions={report.scope.surveys.map((survey) => ({
              value: survey.slug,
              label: survey.title,
            }))}
            versionOptions={report.scope.versions.map((version) => ({
              value: version.id,
              label: `v${version.versionNumber} · ${version.title}`,
            }))}
          />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Started" value={String(report.metrics.total)} />
            <MetricCard
              label="Submitted"
              value={String(report.metrics.submitted)}
            />
            <MetricCard label="Draft" value={String(report.metrics.draft)} />
            <MetricCard
              detail="submitted / started"
              label="Completion"
              value={`${Math.round(report.metrics.completionRate * 100)}%`}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent responses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {report.recentResponses.map((response) => (
                  <div
                    className="flex flex-col gap-1 rounded-[20px] border border-border/70 p-4 sm:flex-row sm:items-center sm:justify-between"
                    key={response.id}
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        {response.id}
                      </p>
                      <p className="survey-muted text-sm">
                        {response.status} · last saved{" "}
                        {response.lastSavedAt.toISOString()}
                      </p>
                    </div>
                    <p className="survey-muted text-sm">
                      {response.submittedAt
                        ? `submitted ${response.submittedAt.toISOString()}`
                        : "not submitted"}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="p-6">
            <p className="survey-muted text-sm">No survey data found.</p>
          </CardContent>
        </Card>
      )}
    </AdminShell>
  );
}
