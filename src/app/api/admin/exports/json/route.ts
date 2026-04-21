import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin/auth";
import { buildResponsesJson } from "@/lib/admin/exports";
import { parseAdminFilters } from "@/lib/admin/filters";

export async function GET(request: Request) {
  await requireAdminSession();

  const url = new URL(request.url);
  const json = await buildResponsesJson(parseAdminFilters(url.searchParams));

  return NextResponse.json(json, {
    headers: {
      "Content-Disposition": 'attachment; filename="survey-responses.json"',
    },
  });
}
