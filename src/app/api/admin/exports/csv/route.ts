import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin/auth";
import { parseAdminFilters } from "@/lib/admin/filters";
import { buildResponsesCsv } from "@/lib/admin/exports";

export async function GET(request: Request) {
  await requireAdminSession();

  const url = new URL(request.url);
  const csv = await buildResponsesCsv(parseAdminFilters(url.searchParams));

  return new NextResponse(csv, {
    headers: {
      "Content-Disposition": 'attachment; filename="survey-responses.csv"',
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}
