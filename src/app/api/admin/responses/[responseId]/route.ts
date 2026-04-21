import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin/auth";
import { getResponseDetail } from "@/lib/admin/reports";

export async function GET(
  _request: Request,
  context: { params: Promise<{ responseId: string }> },
) {
  await requireAdminSession();

  const { responseId } = await context.params;
  const detail = await getResponseDetail(responseId);

  if (!detail) {
    return NextResponse.json({ error: "Response not found." }, { status: 404 });
  }

  return NextResponse.json({
    ...detail,
    startedAt: detail.startedAt.toISOString(),
    lastSavedAt: detail.lastSavedAt.toISOString(),
    submittedAt: detail.submittedAt?.toISOString() ?? null,
  });
}
