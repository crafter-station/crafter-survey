import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  ADMIN_SESSION_COOKIE_NAME,
  verifyAdminSessionToken,
} from "@/lib/admin/session";

export async function getOptionalAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value ?? null;

  return verifyAdminSessionToken(token);
}

export async function requireAdminSession() {
  const session = await getOptionalAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  return session;
}
