import { openai } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
  validateUIMessages,
} from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getEnvValidationMessage, hasRequiredSurveyEnv } from "@/env";
import { getSessionCookieOptions, SESSION_COOKIE_NAME } from "@/lib/session";
import {
  buildSurveyChatMeta,
  getActiveConversationCluster,
  getChatCurrentSectionId,
  getSurveyQuestionIndex,
} from "@/lib/survey/chat-flow";
import {
  ensureSurveyChatState,
  saveSurveyChatState,
  updateSurveyChatMeta,
} from "@/lib/survey/chat-persistence";
import { resolveConversationPlaybook } from "@/lib/survey/conversation-playbook";
import { getResponseBundle } from "@/lib/survey/load-survey";
import { authorizeResponseAccess } from "@/lib/survey/request-access";
import {
  saveSurveyProgress,
  updateSurveyCurrentSection,
} from "@/lib/survey/save-progress";
import {
  serializeSurvey,
  serializeSurveyResponse,
} from "@/lib/survey/serialize";
import { submitSurveyResponse } from "@/lib/survey/submit-response";
import {
  prepareAnswerChanges,
  SurveyValidationError,
} from "@/lib/survey/validation";
import type {
  JsonValue,
  SerializedAnswer,
  SerializedSurvey,
  SurveyChatMessage,
  SurveyQuestion,
} from "@/types/survey";

export const maxDuration = 60;

function jsonError(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

function readSessionToken(headers: Headers) {
  const cookieHeader = headers.get("cookie");
  if (!cookieHeader) return null;

  return (
    cookieHeader
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`))
      ?.split("=")
      .slice(1)
      .join("=") ?? null
  );
}

function describeQuestion(
  question: SurveyQuestion,
  answer: SerializedAnswer | undefined,
) {
  const base: Record<string, unknown> = {
    id: question.id,
    key: question.key,
    prompt: question.prompt,
    helpText: question.helpText ?? undefined,
    type: question.questionType,
  };

  if (question.validation?.maxLength) {
    base.maxLength = question.validation.maxLength;
  }

  if (
    question.questionType === "single_select" ||
    question.questionType === "multi_select"
  ) {
    base.options = question.options.map((option) => ({
      key: option.key,
      label: option.label,
      allowsOtherText: Boolean(option.meta?.allowsText),
    }));

    if (
      question.questionType === "multi_select" &&
      question.validation?.maxSelections
    ) {
      base.maxSelections = question.validation.maxSelections;
    }
  }

  if (answer) {
    base.currentAnswer = answer.valueJson ?? answer.valueText ?? null;
  }

  return base;
}

function buildSurveyContext(
  survey: SerializedSurvey,
  answers: Record<string, SerializedAnswer>,
  chatMeta: SurveyChatMessageContextMeta,
) {
  const playbook = resolveConversationPlaybook(survey);
  const activeCluster = getActiveConversationCluster({
    survey,
    meta: chatMeta,
  });
  const clusters = playbook.map((cluster) => ({
    key: cluster.key,
    title: cluster.title,
    intent: cluster.intent,
    opener: cluster.opener,
    resumePrompt: cluster.resumePrompt,
    followUps: cluster.followUps,
    status: chatMeta.clusterStates[cluster.key]?.status ?? "pending",
    answeredQuestionIds:
      chatMeta.clusterStates[cluster.key]?.answeredQuestionIds ?? [],
    unresolvedQuestionIds:
      chatMeta.clusterStates[cluster.key]?.unresolvedQuestionIds ?? [],
    questions: cluster.questions.map((entry) => ({
      ...describeQuestion(entry.question, answers[entry.question.id]),
      sectionTitle: entry.sectionTitle,
    })),
  }));

  return {
    activeCluster: activeCluster
      ? {
          key: activeCluster.key,
          title: activeCluster.title,
          intent: activeCluster.intent,
          opener: activeCluster.opener,
          resumePrompt: activeCluster.resumePrompt,
          followUps: activeCluster.followUps,
          unresolvedQuestionIds:
            chatMeta.clusterStates[activeCluster.key]?.unresolvedQuestionIds ??
            [],
        }
      : null,
    lastCompletedClusterKey: chatMeta.lastCompletedClusterKey,
    clusters,
  };
}

type SurveyChatMessageContextMeta = ReturnType<typeof buildSurveyChatMeta>;

function createTurnPayload(
  question: SurveyQuestion,
  input: {
    valueText?: string | null;
    choiceKey?: string | null;
    choiceKeys?: string[];
    otherText?: string;
  },
) {
  switch (question.questionType) {
    case "short_text":
    case "long_text":
    case "email":
    case "phone": {
      const valueText = input.valueText?.trim() ?? null;

      if (!valueText) {
        return null;
      }

      return {
        questionId: question.id,
        valueText,
        valueJson: null,
        clientUpdatedAt: new Date().toISOString(),
      };
    }
    case "single_select": {
      const choiceKey = input.choiceKey?.trim() ?? "";

      if (!choiceKey) {
        return null;
      }

      return {
        questionId: question.id,
        valueText: null,
        valueJson: {
          choice: choiceKey,
          ...(input.otherText?.trim()
            ? { otherText: input.otherText.trim() }
            : {}),
        } satisfies JsonValue,
        clientUpdatedAt: new Date().toISOString(),
      };
    }
    case "multi_select": {
      const choiceKeys = Array.from(
        new Set(
          (input.choiceKeys ?? []).filter(
            (choiceKey): choiceKey is string =>
              typeof choiceKey === "string" && choiceKey.trim().length > 0,
          ),
        ),
      );

      if (choiceKeys.length === 0) {
        return null;
      }

      return {
        questionId: question.id,
        valueText: null,
        valueJson: {
          choices: choiceKeys,
          ...(input.otherText?.trim()
            ? { otherText: input.otherText.trim() }
            : {}),
        } satisfies JsonValue,
        clientUpdatedAt: new Date().toISOString(),
      };
    }
  }
}

const SYSTEM_PROMPT = `Eres un entrevistador cálido y muy conciso que completa la Crafter Station Community Survey en español.

Objetivo:
- Conversar con naturalidad.
- Entender el último mensaje del usuario.
- Extraer todas las respuestas confiables que contenga, incluso si cubren varias preguntas.
- Mantener el formulario subyacente actualizado sin mencionar formularios ni controles.
- Guiarte por el PLAYBOOK CONVERSACIONAL, no por una secuencia rígida de campos.

Reglas estrictas:
- Responde siempre en español.
- Mantén cada turno en 1-3 frases cortas.
- Si el usuario aporta una o más respuestas claras, llama una sola vez a la herramienta commit_survey_turn con todo lo que descubriste en ese turno.
- Puedes guardar varias respuestas en la misma llamada.
- Si el usuario quiere saltar una pregunta, incluye su questionId en skippedQuestionIds.
- Piensa en temas, no en campos sueltos. Aprovecha una respuesta para llenar varios campos cuando sea natural.
- Si el usuario responde algo como "Lima, Perú", guarda ciudad y país juntos.
- Después de ubicación, prefiere preguntas amplias sobre qué hace la persona, su background relevante y en qué está enfocada ahora.
- Evita frases literales de formulario como "¿Qué rol te describe mejor?" salvo que necesites aclarar una clasificación.
- Para preguntas de selección, no enumeres opciones al usuario salvo que necesites aclarar.
- Para preguntas de selección, usa solamente los option keys canónicos que ya aparecen en el contexto de la pregunta.
- No inventes ni parafrasees keys. Si no estás seguro entre dos opciones, pide una aclaración y no llames la herramienta todavía.
- Usa \`choiceKey\` para single_select y \`choiceKeys\` para multi_select.
- Si eliges una opción con \`allowsOtherText\`, incluye también \`otherText\` con el detalle del usuario. Si esa pregunta no tiene un fallback de tipo \`other\`, pide una aclaración en vez de adivinar.
- Después de guardar, haz solo la mejor siguiente pregunta humana para el cluster activo o para el siguiente cluster natural.
- No menciones UI, tabs, pickers, botones, herramientas ni JSON.
- El survey se puede enviar aunque esté parcialmente respondido. Solo llama submit_survey cuando el usuario haya terminado o cuando ya no tenga más que agregar por ahora.`;

const SYSTEM_EXAMPLES = `
Ejemplos de comportamiento esperado:
- Si el cluster activo es de presentación y el usuario dice "Lima, Perú", guarda city="Lima" y country="peru" en la misma llamada. Luego muévete a una pregunta amplia sobre qué hace hoy, no vuelvas a preguntar la ciudad.
- Si el usuario dice "Soy diseñadora y ahora estoy freelanceando mientras construyo un side project", intenta guardar role y current_focus en la misma llamada si el mapeo es claro.
- Si el usuario se presenta con nombre, ciudad, país y ocupación en un solo mensaje, guarda todo lo claro de una sola vez.
`;

const turnAnswerSchema = z.object({
  questionId: z.string().uuid(),
  valueText: z.string().nullable().optional(),
  choiceKey: z.string().nullable().optional(),
  choiceKeys: z.array(z.string()).optional(),
  otherText: z.string().optional(),
});

const chatRequestSchema = z.object({
  responseId: z.string().uuid(),
  messages: z.array(z.unknown()),
});

export async function POST(request: Request) {
  if (!hasRequiredSurveyEnv()) {
    return jsonError(
      getEnvValidationMessage() ??
        "Survey is not configured. Set required environment variables.",
      503,
    );
  }

  const apiKey =
    process.env.AI_GATEWAY_API_KEY ?? process.env.VERCEL_AI_GATEWAY_API_KEY;

  if (!apiKey && process.env.VERCEL !== "1") {
    return jsonError(
      "AI Gateway is not configured. Set AI_GATEWAY_API_KEY.",
      503,
    );
  }

  let parsed: z.infer<typeof chatRequestSchema>;

  try {
    parsed = chatRequestSchema.parse(await request.json());
  } catch {
    return jsonError("Invalid chat request payload.", 400);
  }

  const sessionToken = readSessionToken(request.headers);

  const authorization = await authorizeResponseAccess({
    requestHeaders: request.headers,
    responseId: parsed.responseId,
    sessionToken,
  });

  if (authorization.kind === "missing") {
    return jsonError("Survey response not found.", 404);
  }

  if (authorization.kind === "forbidden") {
    return jsonError(
      "You are not allowed to update this survey response.",
      403,
    );
  }

  if (authorization.response.status === "submitted") {
    return jsonError("This survey has already been submitted.", 409);
  }

  let clientMessages: SurveyChatMessage[];

  try {
    clientMessages = await validateUIMessages<SurveyChatMessage>({
      messages: parsed.messages,
    });
  } catch {
    return jsonError("Invalid chat messages.", 400);
  }

  const bundle = authorization.response;
  const survey = serializeSurvey(bundle.surveyVersion);
  const serializedResponse = serializeSurveyResponse(bundle);
  const persistedChatState = await ensureSurveyChatState({
    responseId: bundle.id,
    survey,
    answers: serializedResponse.answers,
  });
  let chatMeta = buildSurveyChatMeta({
    survey,
    answers: serializedResponse.answers,
    meta: persistedChatState.meta,
  });

  const storedIds = new Set(
    persistedChatState.messages.map((message) => message.id),
  );
  const newUserMessages = clientMessages.filter(
    (message) => message.role === "user" && !storedIds.has(message.id),
  );
  const authoritativeMessages = [
    ...persistedChatState.messages,
    ...newUserMessages,
  ];

  if (newUserMessages.length > 0) {
    await saveSurveyChatState({
      responseId: bundle.id,
      messages: authoritativeMessages,
      meta: chatMeta,
    });
  }

  const context = buildSurveyContext(
    survey,
    serializedResponse.answers,
    chatMeta,
  );
  const systemMessage = `${SYSTEM_PROMPT}
${SYSTEM_EXAMPLES}

## PLAYBOOK CONVERSACIONAL
Usa esta capa como guía principal para decidir la siguiente pregunta.
Cluster activo: ${context.activeCluster?.key ?? "ninguno"}
Título del cluster activo: ${context.activeCluster?.title ?? "ninguno"}
Intención del cluster activo: ${context.activeCluster?.intent ?? "ninguna"}
Opener preferido del cluster activo: ${context.activeCluster?.opener ?? "ninguno"}
Resume prompt del cluster activo: ${context.activeCluster?.resumePrompt ?? "ninguno"}
Follow-ups preferidos del cluster activo: ${
    context.activeCluster?.followUps.join(" | ") ?? "ninguno"
  }
Último cluster completado: ${context.lastCompletedClusterKey ?? "ninguno"}

## ESTADO DEL SURVEY
Título: ${survey.title}
Response ID: ${bundle.id}
Preguntas saltadas (IDs): ${
    chatMeta.skippedQuestionIds.length > 0
      ? chatMeta.skippedQuestionIds.join(", ")
      : "ninguna"
  }

## Clusters conversacionales (JSON)
${JSON.stringify(context.clusters, null, 2)}
`;

  const tools = {
    commit_survey_turn: tool({
      description:
        "Guarda una o más respuestas detectadas en el último turno del usuario y actualiza el siguiente foco conversacional.",
      inputSchema: z.object({
        answers: z.array(turnAnswerSchema).max(8).default([]),
        skippedQuestionIds: z.array(z.string().uuid()).max(8).default([]),
        nextClusterKey: z.string().nullable().optional(),
      }),
      execute: async ({ answers, skippedQuestionIds, nextClusterKey }) => {
        const currentBundle = await getResponseBundle(bundle.id);

        if (!currentBundle) {
          return { ok: false, message: "Respuesta del survey no encontrada." };
        }

        const currentSurvey = serializeSurvey(currentBundle.surveyVersion);
        const currentQuestionIndex = getSurveyQuestionIndex(currentSurvey);
        const currentPlaybook = resolveConversationPlaybook(currentSurvey);
        const validClusterKeys = new Set(
          currentPlaybook.map((cluster) => cluster.key),
        );
        const requestedNextClusterKey =
          typeof nextClusterKey === "string" &&
          validClusterKeys.has(nextClusterKey)
            ? nextClusterKey
            : null;
        const dedupedAnswers = Array.from(
          new Map(
            answers.map((answer) => [answer.questionId, answer]),
          ).values(),
        );
        const preparedChanges = [] as Awaited<
          ReturnType<typeof prepareAnswerChanges>
        >;
        const savedQuestionIds: string[] = [];
        const validationErrors: Array<{
          questionId: string;
          questionKey: string | null;
          message: string;
        }> = [];

        for (const answer of dedupedAnswers) {
          const indexedQuestion = currentQuestionIndex.get(answer.questionId);

          if (!indexedQuestion) {
            validationErrors.push({
              questionId: answer.questionId,
              questionKey: null,
              message: "La pregunta no existe.",
            });
            continue;
          }

          const payload = createTurnPayload(indexedQuestion.question, answer);

          if (!payload) {
            continue;
          }

          try {
            const changes = prepareAnswerChanges(currentSurvey, [payload]);
            preparedChanges.push(...changes);
            savedQuestionIds.push(answer.questionId);
          } catch (error) {
            validationErrors.push({
              questionId: answer.questionId,
              questionKey: indexedQuestion.question.key,
              message:
                error instanceof SurveyValidationError
                  ? error.message
                  : "No pudimos guardar esta respuesta.",
            });
          }
        }

        const mergedSkippedQuestionIds = Array.from(
          new Set([
            ...chatMeta.skippedQuestionIds,
            ...skippedQuestionIds.filter((questionId) =>
              currentQuestionIndex.has(questionId),
            ),
          ]),
        ).filter((questionId) => !savedQuestionIds.includes(questionId));

        if (preparedChanges.length > 0) {
          await saveSurveyProgress({
            responseId: bundle.id,
            currentSectionId: currentBundle.currentSectionId,
            changes: preparedChanges,
          });
        }

        const refreshed = await getResponseBundle(bundle.id);

        if (!refreshed) {
          return { ok: false, message: "No pudimos releer el estado." };
        }

        const refreshedSurvey = serializeSurvey(refreshed.surveyVersion);
        const refreshedResponse = serializeSurveyResponse(refreshed);
        chatMeta = buildSurveyChatMeta({
          survey: refreshedSurvey,
          answers: refreshedResponse.answers,
          meta: {
            ...chatMeta,
            skippedQuestionIds: mergedSkippedQuestionIds,
          },
          activeClusterKeyOverride: requestedNextClusterKey,
        });
        const currentSectionId = getChatCurrentSectionId({
          survey: refreshedSurvey,
          meta: chatMeta,
        });

        await updateSurveyCurrentSection({
          responseId: bundle.id,
          currentSectionId,
        });
        await updateSurveyChatMeta({ responseId: bundle.id, meta: chatMeta });

        const activeCluster = getActiveConversationCluster({
          survey: refreshedSurvey,
          meta: chatMeta,
        });

        return {
          ok: validationErrors.length === 0,
          partiallySaved:
            savedQuestionIds.length > 0 && validationErrors.length > 0,
          savedQuestionIds,
          validationErrors,
          currentSectionId,
          activeCluster: activeCluster
            ? {
                key: activeCluster.key,
                title: activeCluster.title,
                intent: activeCluster.intent,
                opener: activeCluster.opener,
                resumePrompt: activeCluster.resumePrompt,
                followUps: activeCluster.followUps,
                unresolvedQuestionIds:
                  chatMeta.clusterStates[activeCluster.key]
                    ?.unresolvedQuestionIds ?? [],
              }
            : null,
        };
      },
    }),
    submit_survey: tool({
      description:
        "Envía el survey cuando el usuario quiera cerrar la conversación y terminar por ahora.",
      inputSchema: z.object({}),
      execute: async () => {
        const currentBundle = await getResponseBundle(bundle.id);

        if (!currentBundle) {
          return { ok: false, message: "Respuesta del survey no encontrada." };
        }

        const currentSurvey = serializeSurvey(currentBundle.surveyVersion);
        const result = await submitSurveyResponse({
          responseId: bundle.id,
          currentSectionId:
            currentBundle.currentSectionId ??
            currentSurvey.sections[0]?.id ??
            null,
          changes: [],
        });

        if (!result.ok) {
          return { ok: false, message: "No pudimos enviar el survey." };
        }

        chatMeta = {
          ...chatMeta,
          activeClusterKey: null,
        };
        await updateSurveyChatMeta({ responseId: bundle.id, meta: chatMeta });

        return { ok: true, submittedAt: result.response.submittedAt };
      },
    }),
  } as const;

  const modelMessages = await convertToModelMessages(authoritativeMessages);
  const result = streamText({
    model: openai.chat("gpt-5.4"),
    system: systemMessage,
    messages: modelMessages,
    tools,
    stopWhen: stepCountIs(8),
  });

  const streamResponse = result.toUIMessageStreamResponse<SurveyChatMessage>({
    originalMessages: authoritativeMessages,
    sendReasoning: false,
    onFinish: async ({ isAborted, messages }) => {
      if (isAborted) {
        return;
      }

      await saveSurveyChatState({
        responseId: bundle.id,
        messages,
        meta: chatMeta,
      });
    },
  });

  if (authorization.sessionTokenToSet) {
    const headers = new Headers(streamResponse.headers);
    const cookieOptions = getSessionCookieOptions();
    const cookieParts = [
      `${SESSION_COOKIE_NAME}=${authorization.sessionTokenToSet}`,
      `Path=${cookieOptions.path ?? "/"}`,
      `Max-Age=${cookieOptions.maxAge ?? 0}`,
      `SameSite=${
        cookieOptions.sameSite
          ? String(cookieOptions.sameSite).charAt(0).toUpperCase() +
            String(cookieOptions.sameSite).slice(1)
          : "Lax"
      }`,
    ];
    if (cookieOptions.httpOnly) cookieParts.push("HttpOnly");
    if (cookieOptions.secure) cookieParts.push("Secure");
    headers.append("Set-Cookie", cookieParts.join("; "));

    return new Response(streamResponse.body, {
      status: streamResponse.status,
      statusText: streamResponse.statusText,
      headers,
    });
  }

  return streamResponse;
}
