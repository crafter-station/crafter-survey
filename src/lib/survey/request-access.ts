import { eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { anonymousSessions } from "@/db/schema";
import { createFingerprintHash } from "@/lib/fingerprint";
import { createAnonymousSessionToken, hashSessionToken } from "@/lib/session";

import { getResponseBundle } from "./load-survey";

export async function authorizeResponseAccess({
  requestHeaders,
  responseId,
  sessionToken,
}: {
  requestHeaders: Headers;
  responseId: string;
  sessionToken: string | null;
}) {
  const db = getDb();
  const response = await getResponseBundle(responseId);

  if (!response) {
    return {
      kind: "missing" as const,
    };
  }

  const fingerprintHash = createFingerprintHash(requestHeaders);
  const now = new Date();

  if (
    sessionToken &&
    hashSessionToken(sessionToken) === response.session.sessionTokenHash
  ) {
    await db
      .update(anonymousSessions)
      .set({
        fingerprintHash,
        lastSeenAt: now,
        updatedAt: now,
      })
      .where(eq(anonymousSessions.id, response.session.id));

    return {
      kind: "authorized" as const,
      response,
      sessionTokenToSet: null,
    };
  }

  if (fingerprintHash !== response.session.fingerprintHash) {
    return {
      kind: "forbidden" as const,
    };
  }

  const sessionTokenToSet = createAnonymousSessionToken();

  await db
    .update(anonymousSessions)
    .set({
      sessionTokenHash: hashSessionToken(sessionTokenToSet),
      fingerprintHash,
      lastSeenAt: now,
      updatedAt: now,
    })
    .where(eq(anonymousSessions.id, response.session.id));

  return {
    kind: "authorized" as const,
    response,
    sessionTokenToSet,
  };
}
