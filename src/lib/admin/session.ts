import { createHmac } from "node:crypto";

import { env } from "@/env";

export const ADMIN_SESSION_COOKIE_NAME = "cs_admin_session";
export const ADMIN_SESSION_COOKIE_MAX_AGE = 60 * 60 * 12;

type AdminSessionPayload = {
  kind: "admin";
  issuedAt: number;
  expiresAt: number;
};

function createSignature(payload: string) {
  return createHmac("sha256", env.SESSION_SECRET)
    .update(`admin-session:${payload}`)
    .digest("hex");
}

export function createAdminSessionToken() {
  const now = Date.now();
  const payload: AdminSessionPayload = {
    kind: "admin",
    issuedAt: now,
    expiresAt: now + ADMIN_SESSION_COOKIE_MAX_AGE * 1000,
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createSignature(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function verifyAdminSessionToken(token: string | null | undefined) {
  if (!token) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  if (createSignature(encodedPayload) !== signature) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as AdminSessionPayload;

    if (payload.kind !== "admin" || payload.expiresAt <= Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function getAdminSessionCookieOptions() {
  return {
    httpOnly: true,
    maxAge: ADMIN_SESSION_COOKIE_MAX_AGE,
    path: "/",
    priority: "high" as const,
    sameSite: "lax" as const,
    secure: env.NODE_ENV === "production",
  };
}
