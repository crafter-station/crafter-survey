import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="survey-kicker text-[0.64rem] uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="survey-heading text-3xl font-medium text-foreground">{value}</div>
        {detail ? <p className="survey-muted text-sm">{detail}</p> : null}
      </CardContent>
    </Card>
  );
}
