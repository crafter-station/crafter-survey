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
import { type ReactNode, useEffect, useMemo, useState } from "react";

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
import type {
  SerializedSurveyResponse,
  SurveyChatFormSaveEvent,
  SurveyChatMessage,
} from "@/types/survey";

import { SurveyShell } from "./survey-shell";

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

function getFormSaveEventLabel(event: SurveyChatFormSaveEvent) {
  const savedCount = event.savedQuestionIds.length;

  return savedCount === 1
    ? "1 respuesta registrada en formulario"
    : `${savedCount} respuestas registradas en formulario`;
}

function collapseFormSaveEvents(events: SurveyChatFormSaveEvent[]) {
  if (events.length === 0) {
    return null;
  }

  const savedQuestionIds = Array.from(
    new Set(events.flatMap((event) => event.savedQuestionIds)),
  );
  const latestEvent = events[events.length - 1];

  return {
    id: latestEvent.id,
    label: getFormSaveEventLabel({
      ...latestEvent,
      savedQuestionIds,
    }),
  };
}

function resolveFormSaveEvents({
  formSaveEvents,
  messages,
}: {
  formSaveEvents: SurveyChatFormSaveEvent[];
  messages: SurveyChatMessage[];
}) {
  const messageIndexById = new Map<string, number>();

  messages.forEach((message, index) => {
    if (message.id) {
      messageIndexById.set(message.id, index);
    }
  });

  const eventsByMessageIndex = new Map<number, SurveyChatFormSaveEvent[]>();
  const unanchored: SurveyChatFormSaveEvent[] = [];

  for (const event of formSaveEvents) {
    const resolvedIndex =
      (event.afterMessageId
        ? messageIndexById.get(event.afterMessageId)
        : undefined) ?? event.afterMessageIndex;

    if (
      typeof resolvedIndex === "number" &&
      resolvedIndex >= 0 &&
      resolvedIndex < messages.length
    ) {
      const existing = eventsByMessageIndex.get(resolvedIndex) ?? [];
      existing.push(event);
      eventsByMessageIndex.set(resolvedIndex, existing);
      continue;
    }

    unanchored.push(event);
  }

  const sortByCreatedAt = (
    left: SurveyChatFormSaveEvent,
    right: SurveyChatFormSaveEvent,
  ) => left.createdAt.localeCompare(right.createdAt);

  const collapsedByMessageIndex = new Map<
    number,
    { id: string; label: string }
  >();

  for (const [messageIndex, events] of eventsByMessageIndex.entries()) {
    events.sort(sortByCreatedAt);
    const collapsed = collapseFormSaveEvents(events);

    if (collapsed) {
      collapsedByMessageIndex.set(messageIndex, collapsed);
    }
  }

  unanchored.sort(sortByCreatedAt);

  return {
    byMessageIndex: collapsedByMessageIndex,
    trailing: collapseFormSaveEvents(unanchored),
  };
}

function UpdatePill({ label }: { label: string }) {
  return (
    <div className="flex justify-center">
      <div className="survey-kicker rounded-full border border-border/70 bg-background/80 px-3 py-1 text-[0.62rem] tracking-[0.18em] text-muted-foreground uppercase shadow-sm backdrop-blur-xl">
        {label}
      </div>
    </div>
  );
}

export function useSurveyChat({
  response,
  onConversationUpdated,
}: {
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

  const formSaveEventsByAnchor = useMemo(
    () =>
      resolveFormSaveEvents({
        formSaveEvents: response.chatState?.meta.formSaveEvents ?? [],
        messages,
      }),
    [messages, response.chatState?.meta.formSaveEvents],
  );

  const isBusy = status === "streaming" || status === "submitted";

  async function handleSubmit({ text }: { text: string }) {
    if (!text.trim() || isBusy) return;
    await sendMessage({ text });
    setInput("");
  }

  return {
    content: (
      <div className="mx-auto flex h-full min-h-0 w-full max-w-3xl flex-col">
        <Conversation className="min-h-0 flex-1 bg-transparent">
          {messages.length === 0 ? (
            <ConversationEmptyState
              description="Responde con libertad. Yo voy completando el survey por detrás."
              icon={<MessageCircleIcon className="size-7 opacity-50" />}
              title="Empecemos"
            />
          ) : (
            <ConversationContent className="gap-5 pb-8 pt-6 sm:pb-10 sm:pt-8">
              {messages.flatMap((message, messageIndex) => {
                const steps = getMessageStepParts(message);
                const items = steps.flatMap((step, stepIndex) => {
                  const text = getStepText(step);
                  const updates = getStepUpdates(step);

                  if (!text && updates.length === 0) {
                    return [];
                  }

                  const stepItems = [];

                  if (text) {
                    stepItems.push(
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
                    stepItems.push(
                      <UpdatePill
                        key={`${message.id || "message"}:${messageIndex}:${stepIndex}:update:${updateIndex}`}
                        label={update}
                      />,
                    );
                  });

                  return stepItems;
                });

                const formSaveEvent =
                  formSaveEventsByAnchor.byMessageIndex.get(messageIndex);

                if (formSaveEvent) {
                  items.push(
                    <UpdatePill
                      key={`form-save:${formSaveEvent.id}`}
                      label={formSaveEvent.label}
                    />,
                  );
                }

                return items;
              })}
              {formSaveEventsByAnchor.trailing ? (
                <UpdatePill
                  key={`form-save:${formSaveEventsByAnchor.trailing.id}`}
                  label={formSaveEventsByAnchor.trailing.label}
                />
              ) : null}
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
      </div>
    ),
    footer: (
      <SurveyChatFooter
        error={error}
        input={input}
        onStop={() => stop()}
        onSubmit={handleSubmit}
        onValueChange={setInput}
        status={status}
      />
    ),
  };
}

export function SurveyChatFooter({
  error,
  input,
  onStop,
  onSubmit,
  onValueChange,
  status,
}: {
  error?: Error | null;
  input: string;
  onStop: () => void;
  onSubmit: ({ text }: { text: string }) => void;
  onValueChange: (value: string) => void;
  status: ReturnType<typeof useChat<SurveyChatMessage>>["status"];
}) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
      {error ? (
        <div className="rounded-[18px] border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-[var(--danger-foreground)]">
          {error.message || "Algo fallo. Reintenta en un momento."}
        </div>
      ) : null}

      <PromptInput
        className="p-3"
        footer={<span>Enter para enviar</span>}
        onStop={onStop}
        onSubmit={onSubmit}
        onValueChange={onValueChange}
        placeholder="Escribe tu respuesta..."
        status={status}
        value={input}
      />
    </div>
  );
}

export function SurveyChatPane({
  chrome,
  response,
  onConversationUpdated,
}: {
  chrome: ReactNode;
  response: SerializedSurveyResponse;
  onConversationUpdated?: () => void;
}) {
  const chatUi = useSurveyChat({
    response,
    onConversationUpdated,
  });

  return (
    <SurveyShell
      chrome={chrome}
      compact
      contentClassName="overflow-hidden"
      contentScrollable={false}
      footer={chatUi.footer}
    >
      {chatUi.content}
    </SurveyShell>
  );
}
