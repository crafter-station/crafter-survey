import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { env } from "@/env";
import { verifyAdminAccessCode } from "@/lib/admin/access-code";
import { createFingerprintHash } from "@/lib/fingerprint";
import {
  ADMIN_SESSION_COOKIE_NAME,
  createAdminSessionToken,
  getAdminSessionCookieOptions,
} from "@/lib/admin/session";
import { getRateLimitHeaders } from "@/lib/ratelimit";

const loginSchema = z.object({ code: z.string().min(1) });

const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
});

const loginLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "10 m"),
  prefix: "crafter-survey:admin-login",
});

export async function POST(request: Request) {
  const requestHeaders = await headers();
  const actor = createFingerprintHash(requestHeaders);
  const limitResult = await loginLimiter.limit(actor);

  if (!limitResult.success) {
    return NextResponse.json(
      { error: "Too many admin login attempts. Please try again soon." },
      {
        status: 429,
        headers: getRateLimitHeaders(limitResult),
      },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success || !verifyAdminAccessCode(parsed.data.code)) {
    return NextResponse.json(
      { error: "Invalid admin access code." },
      { status: 401 },
    );
  }

  const cookieStore = await cookies();
  cookieStore.set(
    ADMIN_SESSION_COOKIE_NAME,
    createAdminSessionToken(),
    getAdminSessionCookieOptions(),
  );

  return NextResponse.json({ ok: true });
}
