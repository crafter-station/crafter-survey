"use client";

import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  isToolUIPart,
  type UIDataTypes,
  type UIMessagePart,
  type UITools,
} from "ai";
import { MessageCircleIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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
  SurveyChatMessage,
} from "@/types/survey";

function getMessageStepParts(message: SurveyChatMessage) {
  const steps: UIMessagePart<UIDataTypes, UITools>[][] = [];
  let currentStep: UIMessagePart<UIDataTypes, UITools>[] = [];

  for (const part of message.parts) {
    if (part.type === "step-start") {
      if (currentStep.length > 0) {
        steps.push(currentStep);
      }
      currentStep = [];
      continue;
    }

    currentStep.push(part);
  }

  if (currentStep.length > 0) {
    steps.push(currentStep);
  }

  return steps.length > 0 ? steps : [message.parts];
}

function getStepText(parts: UIMessagePart<UIDataTypes, UITools>[]) {
  return parts
    .filter(
      (
        part,
      ): part is Extract<
        UIMessagePart<UIDataTypes, UITools>,
        { type: "text" }
      > => part.type === "text" && typeof part.text === "string",
    )
    .map((part) => part.text)
    .join("")
    .trim();
}

function getStepUpdates(parts: UIMessagePart<UIDataTypes, UITools>[]) {
  const updates: string[] = [];

  for (const part of parts) {
    if (!isToolUIPart(part) || part.state !== "output-available") {
      continue;
    }

    if (part.type === "tool-commit_survey_turn") {
      const output = part.output as {
        savedQuestionIds?: unknown;
      } | null;
      const savedCount = Array.isArray(output?.savedQuestionIds)
        ? output.savedQuestionIds.length
        : 0;

      if (savedCount > 0) {
        updates.push(
          savedCount === 1
            ? "1 respuesta registrada"
            : `${savedCount} respuestas registradas`,
        );
      }
    }

    if (part.type === "tool-submit_survey") {
      const output = part.output as { ok?: unknown } | null;

      if (output?.ok === true) {
        updates.push("Encuesta enviada");
      }
    }
  }

  return updates;
}

function countProgress(
  survey: SerializedSurvey,
  response: SerializedSurveyResponse | null,
) {
  const total = survey.sections.reduce(
    (sum, section) => sum + section.questions.length,
    0,
  );

  if (!response) {
    return { answered: 0, total };
  }

  let answered = 0;

  for (const section of survey.sections) {
    for (const question of section.questions) {
      const answer = response.answers[question.id];

      if (!answer) {
        continue;
      }

      if (answer.valueText?.trim()) {
        answered += 1;
        continue;
      }

      if (answer.valueJson !== null && answer.valueJson !== undefined) {
        answered += 1;
      }
    }
  }

  return { answered, total };
}

export function SurveyChat({
  survey,
  response,
  onConversationUpdated,
}: {
  survey: SerializedSurvey;
  response: SerializedSurveyResponse;
  onConversationUpdated?: () => void;
}) {
  const transport = useMemo(
    () =>
      new DefaultChatTransport<SurveyChatMessage>({
        api: "/api/survey/chat",
        body: { responseId: response.id },
      }),
    [response.id],
  );
  const [input, setInput] = useState("");

  const { messages, sendMessage, setMessages, status, error, stop } =
    useChat<SurveyChatMessage>({
      id: response.id,
      messages: response.chatState?.messages ?? [],
      transport,
      onError: (err) => {
        console.error("Survey chat error", err);
      },
      onFinish: () => {
        onConversationUpdated?.();
      },
    });

  useEffect(() => {
    setMessages(response.chatState?.messages ?? []);
  }, [response.chatState?.messages, setMessages]);

  const progress = countProgress(survey, response);
  const isBusy = status === "streaming" || status === "submitted";

  async function handleSubmit({ text }: { text: string }) {
    if (!text.trim() || isBusy) return;
    await sendMessage({ text });
    setInput("");
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-2">
      <div className="survey-kicker flex items-center justify-between text-[0.66rem] uppercase tracking-[0.22em] text-muted-foreground">
        <span>Conversación</span>
        <span>
          {progress.answered}/{progress.total} respuestas
        </span>
      </div>

      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-hidden rounded-[16px] border border-border bg-[var(--panel)]",
        )}
      >
        <Conversation className="flex-1 min-h-0">
          {messages.length === 0 ? (
            <ConversationEmptyState
              description="Responde con libertad. Yo voy completando el survey por detrás."
              icon={<MessageCircleIcon className="size-7 opacity-50" />}
              title="Empecemos"
            />
          ) : (
            <ConversationContent className="gap-4 p-3 sm:p-4">
              {messages.flatMap((message, messageIndex) => {
                const steps = getMessageStepParts(message);

                return steps.flatMap((step, stepIndex) => {
                  const text = getStepText(step);
                  const updates = getStepUpdates(step);

                  if (!text && updates.length === 0) {
                    return [];
                  }

                  const items = [];

                  if (text) {
                    items.push(
                      <Message
                        from={message.role}
                        key={`${message.id || "message"}:${messageIndex}:${stepIndex}:${message.role}`}
                      >
                        <MessageContent>
                          {message.role === "assistant" ? (
                            <MessageResponse>{text}</MessageResponse>
                          ) : (
                            <span className="whitespace-pre-wrap">{text}</span>
                          )}
                        </MessageContent>
                      </Message>,
                    );
                  }

                  updates.forEach((update, updateIndex) => {
                    items.push(
                      <div
                        className="flex justify-center"
                        key={`${message.id || "message"}:${messageIndex}:${stepIndex}:update:${updateIndex}`}
                      >
                        <div className="survey-kicker rounded-full border border-border/70 bg-background/40 px-2.5 py-1 text-[0.62rem] tracking-[0.18em] text-muted-foreground uppercase">
                          {update}
                        </div>
                      </div>,
                    );
                  });

                  return items;
                });
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
          <div className="border-t border-border bg-destructive/10 px-3 py-2 text-sm text-[var(--danger-foreground)]">
            {error.message || "Algo falló. Reintenta en un momento."}
          </div>
        ) : null}

        <div className="border-t border-border p-2 sm:p-2.5">
          <PromptInput
            className="rounded-[12px] p-1.5"
            footer={<span>Enter para enviar</span>}
            onStop={() => stop()}
            onSubmit={handleSubmit}
            onValueChange={setInput}
            placeholder="Escribe tu respuesta..."
            status={status}
            value={input}
          />
        </div>
      </div>
    </div>
  );
}
