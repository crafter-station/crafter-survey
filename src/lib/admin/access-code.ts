import { timingSafeEqual } from "node:crypto";

import { getAdminAccessCode } from "@/env";

export function verifyAdminAccessCode(input: string) {
  const normalizedInput = input.trim();
  const expected = getAdminAccessCode();

  if (!expected) {
    return false;
  }

  const inputBuffer = Buffer.from(normalizedInput);
  const expectedBuffer = Buffer.from(expected);

  if (inputBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(inputBuffer, expectedBuffer);
}
