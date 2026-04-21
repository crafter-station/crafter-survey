import { AdminFilterBar } from "@/components/admin/admin-filter-bar";
import { AdminShell } from "@/components/admin/admin-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { parseAdminFilters } from "@/lib/admin/filters";
import { getQuestionBreakdown } from "@/lib/admin/reports";

export default async function AdminQuestionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseAdminFilters(await searchParams);
  const report = await getQuestionBreakdown(filters);

  return (
    <AdminShell currentPath="/admin/questions" title="Question analytics">
      {report?.selectedQuestion ? (
        <div className="space-y-6">
          <AdminFilterBar
            basePath="/admin/questions"
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
          <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
            <Card>
              <CardHeader>
                <CardTitle>Questions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {report.questions.map((question) => (
                    <a
                      className={[
                        "block rounded-[18px] border px-4 py-3 text-sm transition-colors",
                        question.questionKey ===
                        report.selectedQuestion?.questionKey
                          ? "border-foreground bg-foreground text-background"
                          : "border-border/70 bg-card/70 hover:bg-accent/60",
                      ].join(" ")}
                      href={`/admin/questions?survey=${encodeURIComponent(report.scope.survey.slug)}&version=${encodeURIComponent(report.scope.version.id)}&question=${encodeURIComponent(question.questionKey)}`}
                      key={question.questionId}
                    >
                      <div className="font-medium">{question.prompt}</div>
                      <div className="mt-1 opacity-75">
                        {question.sectionTitle}
                      </div>
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{report.selectedQuestion.prompt}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="survey-muted text-sm">
                    Answered by {report.answeredCount} of{" "}
                    {report.totalSubmittedResponses} submitted responses.
                  </p>
                </CardContent>
              </Card>

              {report.optionBreakdown.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Option breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {report.optionBreakdown.map((option) => (
                        <div className="space-y-1" key={option.id}>
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <span>{option.label}</span>
                            <span className="survey-muted">{option.count}</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-muted/30">
                            <div
                              className="h-full bg-yellow-400"
                              style={{
                                width: `${report.answeredCount > 0 ? (option.count / report.answeredCount) * 100 : 0}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              {report.textAnswers.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Text answers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {report.textAnswers.map((answer, index) => (
                        <div
                          className="rounded-[18px] border border-border/70 p-4 text-sm"
                          key={`${index}:${answer}`}
                        >
                          {answer}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="p-6">
            <p className="survey-muted text-sm">No question analytics available.</p>
          </CardContent>
        </Card>
      )}
    </AdminShell>
  );
}
