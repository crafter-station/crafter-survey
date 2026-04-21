import Link from "next/link";

import { AdminShell } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminExportsPage() {
  return (
    <AdminShell currentPath="/admin/exports" title="Exports">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>CSV export</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="survey-muted text-sm">
              Export scoped survey responses as CSV for spreadsheet analysis.
            </p>
            <Button variant="default">
              <Link href="/api/admin/exports/csv">Download CSV</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Raw JSON export</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="survey-muted text-sm">
              Export raw response rows and answers for deeper analysis.
            </p>
            <Button variant="outline">
              <Link href="/api/admin/exports/json">Download JSON</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
