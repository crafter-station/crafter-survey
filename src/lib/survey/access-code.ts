import { env } from "@/env";

export function normalizeAccessCode(value: string) {
  return value.trim().toUpperCase();
}

export function verifyAccessCode(input: string) {
  return (
    normalizeAccessCode(input) === normalizeAccessCode(env.SURVEY_ACCESS_CODE)
  );
}
