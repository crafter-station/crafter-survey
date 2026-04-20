import { safeValidateUIMessages } from "ai";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db/client";
import { surveyResponseChats } from "@/db/schema";
import type {
  SerializedAnswer,
  SerializedSurvey,
  SerializedSurveyChatState,
  SurveyChatMessage,
  SurveyChatMeta,
} from "@/types/survey";

import {
  buildSurveyChatMeta,
  createInitialSurveyChatMessages,
  normalizeSurveyChatMeta,
} from "./chat-flow";

const SURVEY_CHAT_SCHEMA_VERSION = 1;

const surveyChatClusterStateSchema = z.object({
  status: z.enum(["pending", "in_progress", "done", "skipped"]).optional(),
  answeredQuestionIds: z.array(z.string().uuid()).optional(),
  unresolvedQuestionIds: z.array(z.string().uuid()).optional(),
});

const surveyChatMetaSchema = z.object({
  activeClusterKey: z.string().nullable().optional(),
  lastCompletedClusterKey: z.string().nullable().optional(),
  skippedQuestionIds: z.array(z.string().uuid()).optional(),
  clusterStates: z.record(z.string(), surveyChatClusterStateSchema).optional(),
});

async function parseMessages(messages: unknown) {
  const result = await safeValidateUIMessages<SurveyChatMessage>({ messages });

  return result.success ? result.data : [];
}

function serializeSurveyChatState({
  messages,
  meta,
  updatedAt,
}: {
  messages: SurveyChatMessage[];
  meta: SurveyChatMeta;
  updatedAt: Date | null;
}): SerializedSurveyChatState {
  return {
    messages,
    meta,
    updatedAt: updatedAt?.toISOString() ?? null,
  };
}

export async function getSurveyChatState(responseId: string) {
  const db = getDb();
  const row = await db.query.surveyResponseChats.findFirst({
    where: eq(surveyResponseChats.responseId, responseId),
  });

  if (!row) {
    return null;
  }

  const messages = await parseMessages(row.messagesJson);
  const parsedMeta = surveyChatMetaSchema.safeParse(row.metaJson ?? null);
  const meta = normalizeSurveyChatMeta(
    parsedMeta.success ? parsedMeta.data : null,
  );

  return serializeSurveyChatState({
    messages,
    meta,
    updatedAt: row.updatedAt,
  });
}

export async function saveSurveyChatState({
  responseId,
  messages,
  meta,
}: {
  responseId: string;
  messages: SurveyChatMessage[];
  meta: SurveyChatMeta;
}) {
  const db = getDb();
  const now = new Date();

  await db
    .insert(surveyResponseChats)
    .values({
      responseId,
      schemaVersion: SURVEY_CHAT_SCHEMA_VERSION,
      messagesJson: messages,
      metaJson: meta,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: surveyResponseChats.responseId,
      set: {
        schemaVersion: SURVEY_CHAT_SCHEMA_VERSION,
        messagesJson: messages,
        metaJson: meta,
        updatedAt: now,
      },
    });

  return serializeSurveyChatState({
    messages,
    meta,
    updatedAt: now,
  });
}

export async function updateSurveyChatMeta({
  responseId,
  meta,
}: {
  responseId: string;
  meta: SurveyChatMeta;
}) {
  const db = getDb();
  const now = new Date();

  await db
    .update(surveyResponseChats)
    .set({
      metaJson: meta,
      updatedAt: now,
    })
    .where(eq(surveyResponseChats.responseId, responseId));
}

export async function ensureSurveyChatState({
  responseId,
  survey,
  answers,
}: {
  responseId: string;
  survey: SerializedSurvey;
  answers: Record<string, SerializedAnswer>;
}) {
  const existing = await getSurveyChatState(responseId);
  const syncedMeta = buildSurveyChatMeta({
    survey,
    answers,
    meta: existing?.meta,
  });

  if (existing && existing.messages.length > 0) {
    if (JSON.stringify(existing.meta) === JSON.stringify(syncedMeta)) {
      return existing;
    }

    return saveSurveyChatState({
      responseId,
      messages: existing.messages,
      meta: syncedMeta,
    });
  }

  return saveSurveyChatState({
    responseId,
    messages: createInitialSurveyChatMessages({
      survey,
      answers,
      meta: syncedMeta,
    }),
    meta: normalizeSurveyChatMeta(syncedMeta),
  });
}
