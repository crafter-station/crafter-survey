import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { env } from "@/env";
import { createFingerprintHash } from "@/lib/fingerprint";
import { hashSessionToken } from "@/lib/session";

type SurveyRateLimitRoute = "unlock" | "save" | "submit";

type SurveyRateLimitOptions = {
  route: SurveyRateLimitRoute;
  headers: Headers;
  sessionToken?: string | null;
  responseId?: string | null;
};

type SurveyRateLimitAlgorithm = ReturnType<typeof Ratelimit.slidingWindow>;
type SurveyRateLimitResult = Awaited<ReturnType<Ratelimit["limit"]>>;

const RATE_LIMIT_CONFIG = {
  unlock: {
    limiter: Ratelimit.slidingWindow(10, "10 m"),
    message: "Too many unlock attempts. Please try again soon.",
  },
  save: {
    limiter: Ratelimit.slidingWindow(120, "5 m"),
    message: "You are saving too quickly. Please wait a moment and try again.",
  },
  submit: {
    limiter: Ratelimit.slidingWindow(5, "10 m"),
    message: "Too many submit attempts. Please try again soon.",
  },
} satisfies Record<
  SurveyRateLimitRoute,
  {
    limiter: SurveyRateLimitAlgorithm;
    message: string;
  }
>;

const globalForRateLimit = globalThis as typeof globalThis & {
  __crafterSurveyRateLimitRedis?: Redis;
  __crafterSurveyRateLimiters?: Partial<
    Record<SurveyRateLimitRoute, Ratelimit>
  >;
};

function getRedis() {
  if (!globalForRateLimit.__crafterSurveyRateLimitRedis) {
    globalForRateLimit.__crafterSurveyRateLimitRedis = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    });
  }

  return globalForRateLimit.__crafterSurveyRateLimitRedis;
}

function getLimiter(route: SurveyRateLimitRoute) {
  if (!globalForRateLimit.__crafterSurveyRateLimiters) {
    globalForRateLimit.__crafterSurveyRateLimiters = {};
  }

  const existingLimiter = globalForRateLimit.__crafterSurveyRateLimiters[route];

  if (existingLimiter) {
    return existingLimiter;
  }

  const limiter = new Ratelimit({
    redis: getRedis(),
    limiter: RATE_LIMIT_CONFIG[route].limiter,
    prefix: `crafter-survey:${route}`,
  });

  globalForRateLimit.__crafterSurveyRateLimiters[route] = limiter;

  return limiter;
}

function getActorKey(headers: Headers, sessionToken?: string | null) {
  if (sessionToken) {
    return hashSessionToken(sessionToken);
  }

  return createFingerprintHash(headers);
}

function getRouteKey({
  route,
  headers,
  sessionToken,
  responseId,
}: SurveyRateLimitOptions) {
  if (route === "unlock") {
    return createFingerprintHash(headers);
  }

  return `${getActorKey(headers, sessionToken)}:${responseId ?? "unknown"}`;
}

export async function checkSurveyRateLimit(options: SurveyRateLimitOptions) {
  const result = await getLimiter(options.route).limit(getRouteKey(options));

  return {
    ...result,
    message: RATE_LIMIT_CONFIG[options.route].message,
  };
}

export function getRetryAfterSeconds(result: SurveyRateLimitResult) {
  return Math.max(Math.ceil((result.reset - Date.now()) / 1000), 0);
}

export function getRateLimitHeaders(result: SurveyRateLimitResult) {
  return new Headers({
    "Retry-After": String(getRetryAfterSeconds(result)),
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(result.reset),
  });
}
