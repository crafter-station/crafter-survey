import { AdminFilterBar } from "@/components/admin/admin-filter-bar";
import { AdminShell } from "@/components/admin/admin-shell";
import { ResponsesPageClient } from "@/components/admin/responses-page-client";
import { Card, CardContent } from "@/components/ui/card";
import { parseAdminFilters } from "@/lib/admin/filters";
import { getAdminScopeOptions, listResponses } from "@/lib/admin/reports";

export default async function AdminResponsesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseAdminFilters(await searchParams);
  const [scope, report] = await Promise.all([
    getAdminScopeOptions(filters),
    listResponses(filters),
  ]);

  return (
    <AdminShell currentPath="/admin/responses" title="Responses">
      {scope ? (
        <div className="space-y-6">
          <AdminFilterBar
            basePath="/admin/responses"
            selectedSurvey={scope.survey.slug}
            selectedVersion={scope.version.id}
            surveyOptions={scope.surveys.map((survey) => ({
              value: survey.slug,
              label: survey.title,
            }))}
            versionOptions={scope.versions.map((version) => ({
              value: version.id,
              label: `v${version.versionNumber} · ${version.title}`,
            }))}
          />
          <ResponsesPageClient responses={report?.responses ?? []} />
        </div>
      ) : (
        <Card>
          <CardContent className="p-6">
            <p className="survey-muted text-sm">No response data found.</p>
          </CardContent>
        </Card>
      )}
    </AdminShell>
  );
}
