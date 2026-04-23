import { AdminFilterBar } from "@/components/admin/admin-filter-bar";
import { AdminShell } from "@/components/admin/admin-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { parseAdminFilters } from "@/lib/admin/filters";
import { getQuestionBreakdown } from "@/lib/admin/reports";

function buildQuestionHref({
  surveySlug,
  versionId,
  questionKey,
  includeDrafts,
}: {
  surveySlug: string;
  versionId: string;
  questionKey: string;
  includeDrafts: boolean;
}) {
  const params = new URLSearchParams({
    survey: surveySlug,
    version: versionId,
    question: questionKey,
  });

  if (includeDrafts) {
    params.set("includeDrafts", "1");
  }

  return `/admin/questions?${params.toString()}`;
}

function GroupedAnswersList({
  answers,
}: {
  answers: Array<{ count: number; value: string }>;
}) {
  return (
    <div className="space-y-3">
      {answers.map((answer) => (
        <div
          className="flex items-start justify-between gap-4 rounded-[18px] border border-border/70 p-4 text-sm"
          key={answer.value}
        >
          <div className="min-w-0 flex-1 break-words">{answer.value}</div>
          <div className="survey-muted shrink-0 rounded-full border border-border/70 px-2.5 py-1 text-xs">
            {answer.count}
          </div>
        </div>
      ))}
    </div>
  );
}

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
            includeDrafts={filters.includeDrafts}
            selectedSurvey={report.scope.survey.slug}
            selectedVersion={report.scope.version.id}
            showIncludeDraftsToggle
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
                      href={buildQuestionHref({
                        surveySlug: report.scope.survey.slug,
                        versionId: report.scope.version.id,
                        questionKey: question.questionKey,
                        includeDrafts: filters.includeDrafts,
                      })}
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
                    {report.totalResponses}{" "}
                    {report.includesDrafts
                      ? "responses."
                      : "submitted responses."}
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

              {report.groupedTextAnswers.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Text answers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <GroupedAnswersList answers={report.groupedTextAnswers} />
                  </CardContent>
                </Card>
              ) : null}

              {report.groupedOtherAnswers.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Other text answers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <GroupedAnswersList answers={report.groupedOtherAnswers} />
                  </CardContent>
                </Card>
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="p-6">
            <p className="survey-muted text-sm">
              No question analytics available.
            </p>
          </CardContent>
        </Card>
      )}
    </AdminShell>
  );
}
