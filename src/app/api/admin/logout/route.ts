import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";

import {
  ADMIN_SESSION_COOKIE_NAME,
  getAdminSessionCookieOptions,
} from "@/lib/admin/session";

export async function POST() {
  const cookieStore = await cookies();
  const requestHeaders = await headers();
  cookieStore.set(ADMIN_SESSION_COOKIE_NAME, "", {
    ...getAdminSessionCookieOptions(),
    maxAge: 0,
  });

  const requestOrigin = requestHeaders.get("origin") ?? "http://localhost:3000";
  const requestUrl = new URL(requestOrigin);
  return NextResponse.redirect(new URL("/admin/login", requestUrl.origin), 302);
}
