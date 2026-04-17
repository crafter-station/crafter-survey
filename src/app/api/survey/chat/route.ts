import { createGateway } from "@ai-sdk/gateway";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getEnvValidationMessage, hasRequiredSurveyEnv } from "@/env";
import { getSessionCookieOptions, SESSION_COOKIE_NAME } from "@/lib/session";
import { getResponseBundle } from "@/lib/survey/load-survey";
import { authorizeResponseAccess } from "@/lib/survey/request-access";
import { saveSurveyProgress } from "@/lib/survey/save-progress";
import {
  serializeSurvey,
  serializeSurveyResponse,
} from "@/lib/survey/serialize";
import { submitSurveyResponse } from "@/lib/survey/submit-response";
import {
  getMissingRequiredQuestionIds,
  prepareAnswerChanges,
  SurveyValidationError,
} from "@/lib/survey/validation";
import type {
  SerializedAnswer,
  SerializedSurvey,
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
    required: question.required,
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
) {
  const missing = getMissingRequiredQuestionIds(survey, answers);

  const sectionDump = survey.sections.map((section) => ({
    id: section.id,
    key: section.key,
    title: section.title,
    description: section.description ?? undefined,
    questions: section.questions.map((question) =>
      describeQuestion(question, answers[question.id]),
    ),
  }));

  return {
    missingRequiredIds: missing,
    sections: sectionDump,
  };
}

const SYSTEM_PROMPT = `Eres un entrevistador cálido y conciso que recoge respuestas para la Crafter Station Community Survey. Tu tarea es guiar al usuario para completar TODAS las preguntas de la encuesta en un tono conversacional en español, una pregunta a la vez.

Reglas estrictas:
- Siempre responde en español, con frases cortas y humanas.
- Pregunta una sola cosa a la vez. No listes varias preguntas juntas.
- ANTES de formular cada pregunta, llama a la herramienta ask_question con el questionId. Esto muestra una interfaz interactiva al usuario. Luego redacta la pregunta en una frase corta y amable SIN listar las opciones en texto (la UI ya las muestra).
- Cuando el usuario responda, primero valida e interpreta la respuesta y guárdala usando la herramienta save_answer. Solo entonces llama ask_question para la siguiente pregunta.
- Para single_select y multi_select usa exactamente los \`key\` de las opciones provistas (no inventes keys, no uses los labels).
- Si una opción tiene \`allowsOtherText\`, pide el detalle y envíalo como \`otherText\`.
- Si el usuario da una respuesta ambigua para un select, ofrécele las opciones exactas antes de guardar.
- Si save_answer devuelve un error de validación, discúlpate brevemente, explica el problema y vuelve a pedir esa respuesta con ask_question.
- Respeta \`required\`. Si el usuario quiere saltar una pregunta opcional, acéptalo sin guardar nada.
- Cuando \`missingRequiredIds\` quede vacío, confirma brevemente y llama a la herramienta submit_survey. Luego agradece al usuario.
- Nunca muestres IDs crudos, JSON ni nombres de herramientas al usuario.
- Mantén el turno corto: 1-3 frases máximo por mensaje.`;

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

  const bundle = authorization.response;
  const survey = serializeSurvey(bundle.surveyVersion);
  const serializedResponse = serializeSurveyResponse(bundle);
  const context = buildSurveyContext(survey, serializedResponse.answers);

  const gateway = createGateway(apiKey ? { apiKey } : {});

  const systemMessage = `${SYSTEM_PROMPT}

## Estado actual del survey
Título: ${survey.title}
Response ID: ${bundle.id}
Respuestas faltantes obligatorias (IDs): ${
    context.missingRequiredIds.length > 0
      ? context.missingRequiredIds.join(", ")
      : "ninguna"
  }

## Secciones y preguntas (JSON)
${JSON.stringify(context.sections, null, 2)}
`;

  const tools = {
    ask_question: tool({
      description:
        "Anuncia al cliente que vas a preguntar una pregunta específica. El cliente mostrará un selector interactivo con las opciones apropiadas. Llama esto antes de cada pregunta.",
      inputSchema: z.object({
        questionId: z
          .string()
          .uuid()
          .describe("UUID exacto de la pregunta del survey a formular"),
      }),
      execute: async ({ questionId }) => {
        const question = survey.sections
          .flatMap((section) => section.questions)
          .find((item) => item.id === questionId);
        if (!question) {
          return { ok: false, message: "La pregunta no existe." };
        }
        return {
          ok: true,
          questionId,
          questionKey: question.key,
          questionType: question.questionType,
        };
      },
    }),
    save_answer: tool({
      description:
        "Guarda la respuesta del usuario para una pregunta del survey. Debes usar esta herramienta antes de continuar a la siguiente pregunta.",
      inputSchema: z.object({
        questionId: z.string().uuid().describe("UUID de la pregunta"),
        valueText: z
          .string()
          .nullable()
          .optional()
          .describe("Texto literal para short_text, long_text, email, phone"),
        choice: z
          .string()
          .nullable()
          .optional()
          .describe("Key elegida para single_select"),
        choices: z
          .array(z.string())
          .optional()
          .describe("Keys elegidas para multi_select"),
        otherText: z
          .string()
          .optional()
          .describe(
            "Texto adicional cuando la opción elegida tiene allowsOtherText",
          ),
      }),
      execute: async (input) => {
        const currentBundle = await getResponseBundle(bundle.id);
        if (!currentBundle) {
          return { ok: false, message: "Respuesta del survey no encontrada." };
        }
        const currentSurvey = serializeSurvey(currentBundle.surveyVersion);
        const question = currentSurvey.sections
          .flatMap((section) => section.questions)
          .find((item) => item.id === input.questionId);

        if (!question) {
          return { ok: false, message: "La pregunta no existe." };
        }

        const valueJson = (() => {
          if (question.questionType === "single_select") {
            return {
              choice: input.choice ?? null,
              ...(input.otherText ? { otherText: input.otherText } : {}),
            };
          }
          if (question.questionType === "multi_select") {
            return {
              choices: input.choices ?? [],
              ...(input.otherText ? { otherText: input.otherText } : {}),
            };
          }
          return null;
        })();

        const payload = {
          questionId: input.questionId,
          valueText: input.valueText ?? null,
          valueJson,
          clientUpdatedAt: new Date().toISOString(),
        };

        try {
          const changes = prepareAnswerChanges(currentSurvey, [payload]);
          await saveSurveyProgress({
            responseId: bundle.id,
            currentSectionId:
              currentSurvey.sections.find((section) =>
                section.questions.some((q) => q.id === question.id),
              )?.id ?? null,
            changes,
          });
        } catch (error) {
          const message =
            error instanceof SurveyValidationError
              ? error.message
              : "No pudimos guardar la respuesta.";
          return { ok: false, message };
        }

        const refreshed = await getResponseBundle(bundle.id);
        if (!refreshed) {
          return { ok: false, message: "No pudimos releer el estado." };
        }
        const refreshedSurvey = serializeSurvey(refreshed.surveyVersion);
        const refreshedResponse = serializeSurveyResponse(refreshed);
        const missing = getMissingRequiredQuestionIds(
          refreshedSurvey,
          refreshedResponse.answers,
        );

        return {
          ok: true,
          savedQuestionKey: question.key,
          missingRequiredIds: missing,
          allRequiredAnswered: missing.length === 0,
        };
      },
    }),
    submit_survey: tool({
      description:
        "Envía el survey. Úsalo solo cuando todas las preguntas obligatorias estén respondidas.",
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
          return {
            ok: false,
            message: "Aún faltan respuestas obligatorias.",
            missingRequiredIds: result.missingRequiredQuestionIds,
          };
        }

        return { ok: true, submittedAt: result.response.submittedAt };
      },
    }),
  } as const;

  const uiMessages = parsed.messages as UIMessage[];

  const modelMessages = await convertToModelMessages(uiMessages);

  const result = streamText({
    model: gateway("openai/gpt-4o-mini"),
    system: systemMessage,
    messages: modelMessages,
    tools,
    stopWhen: stepCountIs(6),
  });

  const streamResponse = result.toUIMessageStreamResponse();

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
