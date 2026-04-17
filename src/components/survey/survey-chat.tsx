"use client";

import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  type UIDataTypes,
  type UIMessage,
  type UITools,
} from "ai";
import { MessageCircleIcon, SparklesIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import { PromptInput } from "@/components/ai-elements/prompt-input";
import { cn } from "@/lib/utils";
import type {
  SerializedSurvey,
  SerializedSurveyResponse,
  SurveyQuestion,
} from "@/types/survey";

import { ChatQuestionPicker } from "./chat-question-picker";

type ChatUIMessage = UIMessage<unknown, UIDataTypes, UITools>;

function extractText(message: ChatUIMessage) {
  return message.parts
    .filter(
      (part): part is { type: "text"; text: string } =>
        part.type === "text" &&
        typeof (part as { text?: unknown }).text === "string",
    )
    .map((part) => part.text)
    .join("");
}

function countProgress(
  survey: SerializedSurvey,
  response: SerializedSurveyResponse | null,
) {
  const total = survey.sections.reduce(
    (sum, section) => sum + section.questions.length,
    0,
  );
  if (!response) return { answered: 0, total };

  let answered = 0;
  for (const section of survey.sections) {
    for (const question of section.questions) {
      const answer = response.answers[question.id];
      if (!answer) continue;
      if (answer.valueText?.trim()) {
        answered += 1;
        continue;
      }
      if (answer.valueJson) {
        answered += 1;
      }
    }
  }
  return { answered, total };
}

export function SurveyChat({
  survey,
  response,
  onCompleted,
  onAnswerSaved,
}: {
  survey: SerializedSurvey;
  response: SerializedSurveyResponse;
  onCompleted?: () => void;
  onAnswerSaved?: () => void;
}) {
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/survey/chat",
        body: { responseId: response.id },
      }),
    [response.id],
  );

  const [input, setInput] = useState("");
  const completedRef = useRef(false);

  const { messages, sendMessage, status, error, stop } = useChat({
    transport,
    onError: (err) => {
      console.error("Survey chat error", err);
    },
  });

  const progress = countProgress(survey, response);
  const lastSavedToolCallIdRef = useRef<string | null>(null);

  const questionIndex = useMemo(() => {
    const map = new Map<string, SurveyQuestion>();
    for (const section of survey.sections) {
      for (const question of section.questions) {
        map.set(question.id, question);
      }
    }
    return map;
  }, [survey]);

  const activeQuestion = useMemo<SurveyQuestion | null>(() => {
    const list = messages as ChatUIMessage[];
    for (let index = list.length - 1; index >= 0; index -= 1) {
      const message = list[index];
      if (message.role === "user") {
        return null;
      }
      if (message.role !== "assistant") continue;
      for (
        let partIndex = message.parts.length - 1;
        partIndex >= 0;
        partIndex -= 1
      ) {
        const part = message.parts[partIndex] as unknown as {
          type?: string;
          state?: string;
          output?: { ok?: boolean; questionId?: string };
        };
        if (
          part?.type === "tool-ask_question" &&
          part.state === "output-available" &&
          part.output?.ok &&
          part.output.questionId
        ) {
          return questionIndex.get(part.output.questionId) ?? null;
        }
      }
    }
    return null;
  }, [messages, questionIndex]);

  useEffect(() => {
    if (completedRef.current) return;
    for (const message of messages as ChatUIMessage[]) {
      for (const part of message.parts) {
        if (
          typeof part !== "object" ||
          !part ||
          !("type" in part) ||
          !("state" in part) ||
          part.state !== "output-available"
        ) {
          continue;
        }

        if (part.type === "tool-submit_survey") {
          const output = (part as { output?: { ok?: boolean } }).output;
          if (output?.ok) {
            completedRef.current = true;
            onCompleted?.();
          }
        }

        if (part.type === "tool-save_answer") {
          const toolCallId = (part as { toolCallId?: string }).toolCallId;
          const output = (part as { output?: { ok?: boolean } }).output;
          if (
            output?.ok &&
            toolCallId &&
            toolCallId !== lastSavedToolCallIdRef.current
          ) {
            lastSavedToolCallIdRef.current = toolCallId;
            onAnswerSaved?.();
          }
        }
      }
    }
  }, [messages, onCompleted, onAnswerSaved]);

  useEffect(() => {
    if (messages.length === 0 && status === "ready") {
      sendMessage({
        text: "Hola, estoy listo para empezar la encuesta.",
      });
    }
  }, [messages.length, status, sendMessage]);

  const isBusy = status === "streaming" || status === "submitted";

  async function handleSubmit({ text }: { text: string }) {
    if (!text.trim() || isBusy) return;
    await sendMessage({ text });
    setInput("");
  }

  return (
    <div className="flex min-h-[520px] flex-col gap-3">
      <div className="survey-kicker flex items-center justify-between text-[0.7rem] uppercase tracking-[0.24em]">
        <span className="inline-flex items-center gap-2">
          <SparklesIcon className="size-3.5" />
          Modo conversacional
        </span>
        <span>
          {progress.answered}/{progress.total} respuestas
        </span>
      </div>

      <div
        className={cn(
          "survey-surface flex h-[540px] flex-col overflow-hidden rounded-[18px] border border-border bg-[var(--panel)]",
        )}
      >
        <Conversation className="flex-1 min-h-0">
          {messages.length === 0 ? (
            <ConversationEmptyState
              description="Voy a hacerte preguntas breves. Responde como si habláramos."
              icon={<MessageCircleIcon className="size-8 opacity-50" />}
              title="Empecemos"
            />
          ) : (
            <ConversationContent>
              {(messages as ChatUIMessage[]).map((message) => {
                const text = extractText(message);
                if (!text) return null;
                return (
                  <Message from={message.role} key={message.id}>
                    <MessageContent>
                      {message.role === "assistant" ? (
                        <MessageResponse>{text}</MessageResponse>
                      ) : (
                        <span className="whitespace-pre-wrap">{text}</span>
                      )}
                    </MessageContent>
                  </Message>
                );
              })}
              {status === "submitted" ? (
                <Message from="assistant">
                  <MessageContent>
                    <span className="survey-muted inline-flex items-center gap-1 text-sm">
                      <span className="size-1.5 animate-pulse rounded-full bg-current" />
                      <span className="size-1.5 animate-pulse rounded-full bg-current [animation-delay:150ms]" />
                      <span className="size-1.5 animate-pulse rounded-full bg-current [animation-delay:300ms]" />
                    </span>
                  </MessageContent>
                </Message>
              ) : null}
            </ConversationContent>
          )}
          <ConversationScrollButton />
        </Conversation>

        {error ? (
          <div className="border-t border-border bg-destructive/10 px-4 py-2 text-sm text-[var(--danger-foreground)]">
            {error.message || "Algo falló. Reintenta en un momento."}
          </div>
        ) : null}

        {activeQuestion ? (
          <div className="border-t border-border bg-[var(--panel)] p-3">
            <ChatQuestionPicker
              disabled={isBusy}
              key={activeQuestion.id}
              onSkip={() => {
                if (isBusy) return;
                void sendMessage({ text: "Prefiero saltar esta pregunta." });
              }}
              onSubmit={(value) => {
                if (isBusy) return;
                void sendMessage({ text: value });
              }}
              question={activeQuestion}
            />
          </div>
        ) : null}

        <div className="border-t border-border p-3">
          <PromptInput
            onStop={() => stop()}
            onSubmit={handleSubmit}
            onValueChange={setInput}
            placeholder={
              activeQuestion
                ? "O escribe tu respuesta..."
                : "Escribe tu respuesta..."
            }
            status={status}
            value={input}
          />
        </div>
      </div>
    </div>
  );
}
