import { createHmac, randomBytes } from "node:crypto";

import { env } from "../env";

export const SESSION_COOKIE_NAME = "cs_survey_session";
export const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export function createAnonymousSessionToken() {
  return randomBytes(32).toString("hex");
}

export function hashWithSessionSecret(namespace: string, value: string) {
  return createHmac("sha256", env.SESSION_SECRET)
    .update(`${namespace}:${value}`)
    .digest("hex");
}

export function hashSessionToken(token: string) {
  return hashWithSessionSecret("session", token);
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    maxAge: SESSION_COOKIE_MAX_AGE,
    path: "/",
    priority: "high" as const,
    sameSite: "lax" as const,
    secure: env.NODE_ENV === "production",
  };
}
