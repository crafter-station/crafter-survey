import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

function createValidatedEnv() {
  return createEnv({
    server: {
      DATABASE_URL: z.url(),
      NODE_ENV: z
        .enum(["development", "test", "production"])
        .default("development"),
      SESSION_SECRET: z.string().min(1),
      SURVEY_ACCESS_CODE: z.string().min(1),
      UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
      UPSTASH_REDIS_REST_URL: z.url(),
      ADMIN_ACCESS_CODE: z.string().min(1).optional(),
      AI_GATEWAY_API_KEY: z.string().min(1).optional(),
      VERCEL_AI_GATEWAY_API_KEY: z.string().min(1).optional(),
    },
    client: {},
    emptyStringAsUndefined: true,
    runtimeEnv: {
      DATABASE_URL: process.env.DATABASE_URL,
      NODE_ENV: process.env.NODE_ENV,
      SESSION_SECRET: process.env.SESSION_SECRET,
      SURVEY_ACCESS_CODE: process.env.SURVEY_ACCESS_CODE,
      UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
      UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
      ADMIN_ACCESS_CODE: process.env.ADMIN_ACCESS_CODE,
      AI_GATEWAY_API_KEY: process.env.AI_GATEWAY_API_KEY,
      VERCEL_AI_GATEWAY_API_KEY: process.env.VERCEL_AI_GATEWAY_API_KEY,
    },
  });
}

type AppEnv = ReturnType<typeof createValidatedEnv>;

let cachedEnv: AppEnv | null = null;

function resolveEnv() {
  if (!cachedEnv) {
    cachedEnv = createValidatedEnv();
  }

  return cachedEnv;
}

export const env = new Proxy({} as AppEnv, {
  get(_target, property) {
    return resolveEnv()[property as keyof AppEnv];
  },
});

export function hasRequiredSurveyEnv() {
  try {
    resolveEnv();
    return true;
  } catch {
    return false;
  }
}

export function getEnvValidationMessage() {
  try {
    resolveEnv();
    return null;
  } catch (error) {
    if (error instanceof Error) {
      return error.message;
    }

    return "Invalid environment configuration.";
  }
}

export function getAdminAccessCode() {
  return env.ADMIN_ACCESS_CODE ?? null;
}
