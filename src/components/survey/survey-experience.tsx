"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, useReducedMotion } from "framer-motion";
import {
  type FormEvent,
  startTransition,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";

import type {
  JsonValue,
  SaveAnswerPayload,
  SaveErrorResponseBody,
  SaveRequestBody,
  SaveResponseBody,
  SerializedAnswer,
  SerializedSurveyResponse,
  SurveyPageData,
  UnlockResponseBody,
} from "@/types/survey";

import { Button } from "@/components/ui/button";

import { AccessGate } from "./access-gate";
import { CompletionScreen } from "./completion-screen";
import { type SurveyMode, SurveyModeToggle } from "./mode-toggle";
import { ProgressNav } from "./progress-nav";
import { QuestionRenderer } from "./question-renderer";
import { SectionPanel } from "./section-panel";
import { SurveyChatPane } from "./survey-chat";
import { SurveyCompactChrome } from "./survey-compact-chrome";
import { SurveyHeroChrome } from "./survey-hero-chrome";
import { SurveyShell } from "./survey-shell";

const MODE_STORAGE_KEY = "cs_survey_mode";
const OUTBOX_STORAGE_KEY = "cs_survey_outbox_v1";
const SURVEY_QUERY_KEY = ["survey-experience"] as const;

interface PendingSurveyOutbox {
  responseId: string;
  currentSectionId: string | null;
  touchSection: boolean;
  answers: Record<string, SaveAnswerPayload>;
  retryCount: number;
}

function readMultiSelectChoices(answer: SerializedAnswer | undefined) {
  const candidate = answer?.valueJson;

  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return [] as string[];
  }

  return "choices" in candidate && Array.isArray(candidate.choices)
    ? candidate.choices.filter(
        (choice): choice is string => typeof choice === "string",
      )
    : [];
}

function getInitialSectionIndex(
  survey: SurveyPageData["survey"],
  currentSectionId: string | null | undefined,
) {
  if (!survey || !currentSectionId) {
    return 0;
  }

  const index = survey.sections.findIndex(
    (section) => section.id === currentSectionId,
  );

  return index >= 0 ? index : 0;
}

function isTextEntryQuestion(questionType: string) {
  return (
    questionType === "short_text" ||
    questionType === "email" ||
    questionType === "phone" ||
    questionType === "long_text"
  );
}

function createOutbox(
  responseId: string,
  currentSectionId: string | null,
): PendingSurveyOutbox {
  return {
    responseId,
    currentSectionId,
    touchSection: false,
    answers: {},
    retryCount: 0,
  };
}

function hasPendingOutbox(outbox: PendingSurveyOutbox | null) {
  if (!outbox) {
    return false;
  }

  return outbox.touchSection || Object.keys(outbox.answers).length > 0;
}

function getOutboxStorageKey(responseId: string) {
  return `${OUTBOX_STORAGE_KEY}:${responseId}`;
}

function normalizeOutbox(
  outbox: PendingSurveyOutbox | null,
): PendingSurveyOutbox | null {
  if (!outbox) {
    return null;
  }

  return hasPendingOutbox(outbox) ? outbox : null;
}

function readStoredOutbox(responseId: string): PendingSurveyOutbox | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(getOutboxStorageKey(responseId));

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<PendingSurveyOutbox> | null;

    if (!parsed || parsed.responseId !== responseId) {
      return null;
    }

    const answers: Record<string, SaveAnswerPayload> = {};

    if (parsed.answers && typeof parsed.answers === "object") {
      for (const [questionId, value] of Object.entries(parsed.answers)) {
        if (!value || typeof value !== "object") {
          continue;
        }

        if (
          questionId.length > 0 &&
          "questionId" in value &&
          value.questionId === questionId &&
          "clientUpdatedAt" in value &&
          typeof value.clientUpdatedAt === "string"
        ) {
          answers[questionId] = {
            questionId,
            valueText:
              "valueText" in value ? (value.valueText as string | null) : null,
            valueJson:
              "valueJson" in value
                ? (value.valueJson as JsonValue | null)
                : null,
            clientUpdatedAt: value.clientUpdatedAt,
          };
        }
      }
    }

    return normalizeOutbox({
      responseId,
      currentSectionId:
        typeof parsed.currentSectionId === "string" ||
        parsed.currentSectionId === null
          ? parsed.currentSectionId
          : null,
      touchSection: parsed.touchSection === true,
      answers,
      retryCount:
        typeof parsed.retryCount === "number" &&
        Number.isFinite(parsed.retryCount)
          ? parsed.retryCount
          : 0,
    });
  } catch {
    return null;
  }
}

function mergePendingAnswers(
  currentAnswers: Record<string, SerializedAnswer>,
  pendingAnswers: Record<string, SaveAnswerPayload>,
) {
  const merged = { ...currentAnswers };

  for (const [questionId, pendingAnswer] of Object.entries(pendingAnswers)) {
    const currentAnswer = merged[questionId];

    if (
      currentAnswer &&
      currentAnswer.clientUpdatedAt > pendingAnswer.clientUpdatedAt
    ) {
      continue;
    }

    merged[questionId] = {
      questionId,
      valueText: pendingAnswer.valueText,
      valueJson: pendingAnswer.valueJson,
      clientUpdatedAt: pendingAnswer.clientUpdatedAt,
    };
  }

  return merged;
}

function hydrateClientData(
  nextData: SurveyPageData,
  storedOutbox: PendingSurveyOutbox | null = nextData.response
    ? readStoredOutbox(nextData.response.id)
    : null,
) {
  const nextResponse = nextData.response;
  const shouldRestoreOutbox =
    nextData.mode === "survey" && nextResponse && storedOutbox;
  const mergedAnswers = shouldRestoreOutbox
    ? mergePendingAnswers(nextResponse.answers, storedOutbox.answers)
    : (nextResponse?.answers ?? {});
  const nextSectionId =
    shouldRestoreOutbox && storedOutbox.touchSection
      ? storedOutbox.currentSectionId
      : (nextResponse?.currentSectionId ?? null);

  return {
    mergedAnswers,
    nextSectionId,
    restoredOutbox: shouldRestoreOutbox ? storedOutbox : null,
    pageData: {
      ...nextData,
      response: nextResponse
        ? {
            ...nextResponse,
            currentSectionId: nextSectionId,
            answers: mergedAnswers,
          }
        : null,
    } satisfies SurveyPageData,
  };
}

export function SurveyExperience({
  initialData,
}: {
  initialData: SurveyPageData;
}) {
  const reducedMotion = useReducedMotion();

  const queryClient = useQueryClient();
  const initialClientStateRef = useRef<ReturnType<
    typeof hydrateClientData
  > | null>(null);
  const restoredOutboxResponseIdRef = useRef<string | null>(null);

  if (!initialClientStateRef.current) {
    initialClientStateRef.current = hydrateClientData(initialData, null);
  }

  const initialClientState = initialClientStateRef.current;
  const questionInputRefs = useRef(
    new Map<string, HTMLInputElement | HTMLTextAreaElement | null>(),
  );

  const surveyStateQuery = useQuery({
    gcTime: Infinity,
    initialData: initialClientState.pageData,
    queryFn: async () => initialClientState.pageData,
    queryKey: SURVEY_QUERY_KEY,
    retry: false,
    staleTime: Infinity,
  });

  const pageData = surveyStateQuery.data;
  const mode = pageData.mode;
  const gate = pageData.gate;
  const survey = pageData.survey;
  const response = pageData.response;
  const [answers, setAnswers] = useState<Record<string, SerializedAnswer>>(
    initialClientState.mergedAnswers,
  );
  const [currentSectionIndex, setCurrentSectionIndex] = useState(
    getInitialSectionIndex(survey, initialClientState.nextSectionId),
  );
  const [unlockCode, setUnlockCode] = useState("");
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [direction, setDirection] = useState(1);
  const [surveyMode, setSurveyMode] = useState<SurveyMode>("chat");
  const [showCompletionConfetti, setShowCompletionConfetti] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem(MODE_STORAGE_KEY);
      if (stored === "chat" || stored === "form") {
        setSurveyMode(stored);
      }
    }
  }, []);

  function updateSurveyMode(nextMode: SurveyMode) {
    setSurveyMode(nextMode);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(MODE_STORAGE_KEY, nextMode);
    }
  }

  const contentScrollRef = useRef<HTMLDivElement | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveQueueRef = useRef(Promise.resolve(true));
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const outboxRef = useRef<PendingSurveyOutbox | null>(null);
  const answersRef = useRef(answers);
  const responseRef = useRef(response);

  const currentSection = survey?.sections[currentSectionIndex] ?? null;

  answersRef.current = answers;
  responseRef.current = response;

  const clearRetryTimer = useEffectEvent(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  });

  const persistOutbox = useEffectEvent(
    (nextOutbox: PendingSurveyOutbox | null) => {
      const previousResponseId = outboxRef.current?.responseId ?? null;
      const normalizedOutbox = normalizeOutbox(nextOutbox);

      outboxRef.current = normalizedOutbox;

      if (typeof window === "undefined") {
        return;
      }

      if (
        previousResponseId &&
        previousResponseId !== normalizedOutbox?.responseId
      ) {
        window.localStorage.removeItem(getOutboxStorageKey(previousResponseId));
      }

      if (!normalizedOutbox) {
        const responseIdToClear = nextOutbox?.responseId ?? previousResponseId;

        if (responseIdToClear) {
          window.localStorage.removeItem(
            getOutboxStorageKey(responseIdToClear),
          );
        }

        return;
      }

      window.localStorage.setItem(
        getOutboxStorageKey(normalizedOutbox.responseId),
        JSON.stringify(normalizedOutbox),
      );
    },
  );

  const scheduleRetry = useEffectEvent(
    (retryCount: number, retryAfterSeconds?: number) => {
      clearRetryTimer();

      const backoffMs = retryAfterSeconds
        ? retryAfterSeconds * 1000
        : Math.min(1000 * 2 ** Math.min(retryCount, 4), 15000);

      retryTimerRef.current = setTimeout(() => {
        retryTimerRef.current = null;
        void flushDirty();
      }, backoffMs);
    },
  );

  const setSurveyPageData = useEffectEvent(
    (
      nextData: SurveyPageData | ((current: SurveyPageData) => SurveyPageData),
    ) => {
      queryClient.setQueryData<SurveyPageData>(SURVEY_QUERY_KEY, (current) => {
        const base = current ?? initialClientState.pageData;

        return typeof nextData === "function" ? nextData(base) : nextData;
      });
    },
  );

  const refreshMutation = useMutation<SurveyPageData, Error, string>({
    mutationFn: async (responseId) => {
      const url = new URL("/api/survey/state", window.location.origin);
      url.searchParams.set("responseId", responseId);

      const res = await fetch(url.toString(), { method: "GET" });

      if (!res.ok) {
        throw new Error("Failed to refresh survey state.");
      }

      const data = (await res.json().catch(() => null)) as {
        survey?: SurveyPageData["survey"];
        response?: SurveyPageData["response"];
      } | null;

      if (!data?.survey || !data.response) {
        throw new Error("Missing refreshed survey state.");
      }

      return {
        mode: data.response.status === "submitted" ? "submitted" : "survey",
        gate,
        survey: data.survey,
        response: data.response,
        message: null,
      } satisfies SurveyPageData;
    },
  });

  const unlockMutation = useMutation<UnlockResponseBody, Error, string>({
    mutationFn: async (code) => {
      const unlockResponse = await fetch("/api/survey/unlock", {
        body: JSON.stringify({ code }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });

      const payload = (await unlockResponse.json().catch(() => null)) as {
        message?: string;
        response?: SurveyPageData["response"];
        survey?: SurveyPageData["survey"];
      } | null;

      if (!unlockResponse.ok || !payload?.response || !payload.survey) {
        throw new Error(
          payload?.message ?? "No pudimos desbloquear el survey.",
        );
      }

      return {
        response: payload.response,
        survey: payload.survey,
      };
    },
  });

  const saveMutation = useMutation<
    { data: SaveErrorResponseBody | SaveResponseBody | null; ok: boolean },
    Error,
    SaveRequestBody
  >({
    mutationFn: async (payload) => {
      const saveResponse = await fetch("/api/survey/save", {
        body: JSON.stringify(payload),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });

      const data = (await saveResponse.json().catch(() => null)) as
        | SaveErrorResponseBody
        | SaveResponseBody
        | null;

      return {
        data,
        ok: saveResponse.ok,
      };
    },
  });

  const submitMutation = useMutation<
    SerializedSurveyResponse,
    Error,
    SaveRequestBody
  >({
    mutationFn: async (payload) => {
      const submitResponse = await fetch("/api/survey/submit", {
        body: JSON.stringify(payload),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });

      const data = (await submitResponse.json().catch(() => null)) as {
        message?: string;
        response?: SurveyPageData["response"];
      } | null;

      if (!submitResponse.ok || !data?.response) {
        throw new Error(data?.message ?? "Failed to submit survey.");
      }

      return data.response;
    },
  });

  const unlockPending = unlockMutation.isPending;
  const submitPending = submitMutation.isPending;

  const refreshFromServer = useEffectEvent(async () => {
    if (mode !== "survey" || !response) return;

    try {
      const nextData = await refreshMutation.mutateAsync(response.id);
      hydrateFromServer(nextData);
    } catch {
      // ignore
    }
  });

  const hydrateFromServer = useEffectEvent((nextData: SurveyPageData) => {
    const hydrated = hydrateClientData(nextData);

    clearRetryTimer();
    setSurveyPageData(hydrated.pageData);
    setAnswers(hydrated.mergedAnswers);
    setCurrentSectionIndex(
      getInitialSectionIndex(nextData.survey, hydrated.nextSectionId),
    );
    setUnlockError(null);

    if (hydrated.restoredOutbox) {
      persistOutbox(hydrated.restoredOutbox);
      scheduleRetry(hydrated.restoredOutbox.retryCount);
      return;
    }

    persistOutbox(null);
  });

  const flushDirty = useEffectEvent(
    async ({
      forceTouch = false,
      keepalive = false,
      nextSectionId,
    }: {
      forceTouch?: boolean;
      keepalive?: boolean;
      nextSectionId?: string | null;
    } = {}) => {
      if (mode !== "survey") {
        return true;
      }

      const activeResponse = responseRef.current;

      if (!activeResponse) {
        return true;
      }

      const currentOutbox =
        outboxRef.current?.responseId === activeResponse.id
          ? outboxRef.current
          : createOutbox(activeResponse.id, activeResponse.currentSectionId);
      const targetSectionId =
        nextSectionId ??
        currentOutbox.currentSectionId ??
        currentSection?.id ??
        activeResponse.currentSectionId ??
        null;
      const shouldTouchSection = forceTouch || currentOutbox.touchSection;
      const pendingAnswers = Object.values(currentOutbox.answers);

      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }

      if (!pendingAnswers.length && !shouldTouchSection) {
        return true;
      }

      const payload: SaveRequestBody = {
        responseId: activeResponse.id,
        currentSectionId: targetSectionId,
        answers: pendingAnswers,
      };

      const execute = async () => {
        try {
          if (keepalive) {
            void fetch("/api/survey/save", {
              body: JSON.stringify(payload),
              headers: {
                "content-type": "application/json",
              },
              keepalive: true,
              method: "POST",
            });
            return true;
          }

          const result = await saveMutation.mutateAsync(payload);
          const data = result.data;

          if (!result.ok) {
            const errorData = data as SaveErrorResponseBody | null;

            if (errorData?.code === "response_submitted") {
              clearRetryTimer();
              persistOutbox(null);
              await refreshFromServer();
              return false;
            }

            if (
              errorData?.code === "response_forbidden" ||
              errorData?.code === "response_not_found" ||
              errorData?.code === "invalid_save_request"
            ) {
              clearRetryTimer();
              persistOutbox(null);
              return false;
            }

            const latestOutbox =
              outboxRef.current?.responseId === payload.responseId
                ? outboxRef.current
                : currentOutbox;
            const nextRetryCount = latestOutbox.retryCount + 1;

            persistOutbox({
              ...latestOutbox,
              currentSectionId: targetSectionId,
              touchSection: shouldTouchSection || latestOutbox.touchSection,
              retryCount: nextRetryCount,
            });
            scheduleRetry(nextRetryCount, errorData?.retryAfterSeconds);
            return false;
          }

          const responseData = data as SaveResponseBody | null;
          const latestAnswers = answersRef.current;
          const activeOutbox =
            outboxRef.current?.responseId === payload.responseId
              ? outboxRef.current
              : currentOutbox;
          const nextOutbox: PendingSurveyOutbox = {
            ...activeOutbox,
            currentSectionId: responseData?.currentSectionId ?? targetSectionId,
            touchSection: false,
            retryCount: 0,
            answers: { ...activeOutbox.answers },
          };

          for (const pendingAnswer of payload.answers) {
            const currentAnswer = latestAnswers[pendingAnswer.questionId];

            if (
              currentAnswer?.clientUpdatedAt === pendingAnswer.clientUpdatedAt
            ) {
              delete nextOutbox.answers[pendingAnswer.questionId];
            }
          }

          clearRetryTimer();
          persistOutbox(nextOutbox);
          setSurveyPageData((current) =>
            current.response
              ? {
                  ...current,
                  response: {
                    ...current.response,
                    currentSectionId:
                      responseData?.currentSectionId ?? targetSectionId,
                    lastSavedAt:
                      responseData?.lastSavedAt ?? current.response.lastSavedAt,
                  },
                }
              : current,
          );
          return true;
        } catch {
          const latestOutbox =
            outboxRef.current?.responseId === payload.responseId
              ? outboxRef.current
              : currentOutbox;
          const nextRetryCount = latestOutbox.retryCount + 1;

          persistOutbox({
            ...latestOutbox,
            currentSectionId: targetSectionId,
            touchSection: shouldTouchSection || latestOutbox.touchSection,
            retryCount: nextRetryCount,
          });
          scheduleRetry(nextRetryCount);
          return false;
        }
      };

      const queuedSave = saveQueueRef.current.then(execute, execute);
      saveQueueRef.current = queuedSave;

      return queuedSave;
    },
  );

  const scheduleAutosave = useEffectEvent(() => {
    if (mode !== "survey" || !response) {
      return;
    }

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(() => {
      void flushDirty();
    }, 900);
  });

  const scrollToSectionTop = useEffectEvent(() => {
    window.setTimeout(() => {
      contentScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }, 80);
  });

  const scrollToQuestion = useEffectEvent((questionId: string) => {
    window.setTimeout(() => {
      const container = contentScrollRef.current;
      const element = document.getElementById(`question-${questionId}`);

      if (!container || !element) {
        return;
      }

      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const top =
        container.scrollTop + elementRect.top - containerRect.top - 20;

      container.scrollTo({ top, behavior: "smooth" });
    }, 80);
  });

  const focusQuestionInput = useEffectEvent((questionId: string) => {
    window.setTimeout(() => {
      const input = questionInputRefs.current.get(questionId);

      if (!input || input.disabled) {
        return;
      }

      input.focus({ preventScroll: true });
    }, 180);
  });

  const handleSingleSelectCommit = useEffectEvent((questionId: string) => {
    if (!currentSection) {
      return;
    }

    const currentQuestionIndex = currentSection.questions.findIndex(
      (question) => question.id === questionId,
    );

    if (currentQuestionIndex < 0) {
      return;
    }

    const nextQuestion = currentSection.questions[currentQuestionIndex + 1];

    if (nextQuestion) {
      scrollToQuestion(nextQuestion.id);

      if (isTextEntryQuestion(nextQuestion.questionType)) {
        focusQuestionInput(nextQuestion.id);
      }
    }
  });

  const sendKeepaliveSave = useEffectEvent(() => {
    if (
      !response ||
      mode !== "survey" ||
      !hasPendingOutbox(outboxRef.current)
    ) {
      return;
    }

    void flushDirty({ keepalive: true });
  });

  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }

      clearRetryTimer();
    };
  }, [clearRetryTimer]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        sendKeepaliveSave();
        return;
      }

      if (
        document.visibilityState === "visible" &&
        hasPendingOutbox(outboxRef.current)
      ) {
        void flushDirty();
      }
    };

    const handlePageHide = () => {
      sendKeepaliveSave();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [flushDirty, sendKeepaliveSave]);

  useEffect(() => {
    const handleOnline = () => {
      if (hasPendingOutbox(outboxRef.current)) {
        void flushDirty();
      }
    };

    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, [flushDirty]);

  useEffect(() => {
    if (
      !initialData.response ||
      !initialData.survey ||
      initialData.mode !== "survey"
    ) {
      return;
    }

    if (restoredOutboxResponseIdRef.current === initialData.response.id) {
      return;
    }

    restoredOutboxResponseIdRef.current = initialData.response.id;

    const storedOutbox = readStoredOutbox(initialData.response.id);

    if (!storedOutbox) {
      return;
    }

    const hydrated = hydrateClientData(initialData, storedOutbox);

    setSurveyPageData(hydrated.pageData);
    setAnswers(hydrated.mergedAnswers);
    setCurrentSectionIndex(
      getInitialSectionIndex(initialData.survey, hydrated.nextSectionId),
    );
    persistOutbox(storedOutbox);
    scheduleRetry(storedOutbox.retryCount);
  }, [initialData, persistOutbox, scheduleRetry, setSurveyPageData]);

  function updateAnswer(
    questionId: string,
    value: { valueText: string | null; valueJson: JsonValue | null },
  ) {
    const activeResponse = responseRef.current;

    if (!activeResponse) {
      return;
    }

    const nextAnswer: SerializedAnswer = {
      questionId,
      valueText: value.valueText,
      valueJson: value.valueJson,
      clientUpdatedAt: new Date().toISOString(),
    };

    setAnswers((current) => ({
      ...current,
      [questionId]: nextAnswer,
    }));
    persistOutbox({
      ...(outboxRef.current?.responseId === activeResponse.id
        ? outboxRef.current
        : createOutbox(
            activeResponse.id,
            currentSection?.id ?? activeResponse.currentSectionId,
          )),
      currentSectionId: currentSection?.id ?? activeResponse.currentSectionId,
      answers: {
        ...(outboxRef.current?.responseId === activeResponse.id
          ? outboxRef.current.answers
          : {}),
        [questionId]: {
          questionId,
          valueText: nextAnswer.valueText,
          valueJson: nextAnswer.valueJson,
          clientUpdatedAt: nextAnswer.clientUpdatedAt,
        },
      },
      retryCount: 0,
    });
    scheduleAutosave();
  }

  async function handleUnlockSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUnlockError(null);

    try {
      const payload = await unlockMutation.mutateAsync(unlockCode);

      hydrateFromServer({
        mode: payload.response.status === "submitted" ? "submitted" : "survey",
        gate,
        survey: payload.survey,
        response: payload.response,
        message: null,
      });
      setUnlockCode("");
    } catch (error) {
      setUnlockError(
        error instanceof Error
          ? error.message
          : "No pudimos desbloquear el survey.",
      );
    }
  }

  async function handleBack() {
    if (!survey || !response || currentSectionIndex === 0) {
      return;
    }

    const nextIndex = currentSectionIndex - 1;
    const targetSection = survey.sections[nextIndex];

    if (mode === "survey") {
      persistOutbox({
        ...(outboxRef.current?.responseId === response.id
          ? outboxRef.current
          : createOutbox(response.id, targetSection.id)),
        currentSectionId: targetSection.id,
        touchSection: true,
        retryCount: 0,
      });
      setSurveyPageData((current) =>
        current.response
          ? {
              ...current,
              response: {
                ...current.response,
                currentSectionId: targetSection.id,
              },
            }
          : current,
      );
      void flushDirty({ forceTouch: true, nextSectionId: targetSection.id });
    }

    setDirection(-1);
    startTransition(() => {
      setCurrentSectionIndex(nextIndex);
    });
    scrollToSectionTop();
  }

  async function handleNext() {
    if (!survey || !response || !currentSection) {
      return;
    }

    const nextIndex = currentSectionIndex + 1;
    const targetSection = survey.sections[nextIndex];

    if (!targetSection) {
      return;
    }

    if (mode === "survey") {
      persistOutbox({
        ...(outboxRef.current?.responseId === response.id
          ? outboxRef.current
          : createOutbox(response.id, targetSection.id)),
        currentSectionId: targetSection.id,
        touchSection: true,
        retryCount: 0,
      });
      setSurveyPageData((current) =>
        current.response
          ? {
              ...current,
              response: {
                ...current.response,
                currentSectionId: targetSection.id,
              },
            }
          : current,
      );
      void flushDirty({ forceTouch: true, nextSectionId: targetSection.id });
    }

    setDirection(1);
    startTransition(() => {
      setCurrentSectionIndex(nextIndex);
    });
    scrollToSectionTop();
  }

  async function handleSectionJump(sectionId: string) {
    if (!survey || !response || !currentSection) {
      return;
    }

    const nextIndex = survey.sections.findIndex(
      (section) => section.id === sectionId,
    );

    if (nextIndex < 0 || nextIndex === currentSectionIndex) {
      return;
    }

    const targetSection = survey.sections[nextIndex];

    if (mode === "survey") {
      persistOutbox({
        ...(outboxRef.current?.responseId === response.id
          ? outboxRef.current
          : createOutbox(response.id, targetSection.id)),
        currentSectionId: targetSection.id,
        touchSection: true,
        retryCount: 0,
      });
      setSurveyPageData((current) =>
        current.response
          ? {
              ...current,
              response: {
                ...current.response,
                currentSectionId: targetSection.id,
              },
            }
          : current,
      );
      void flushDirty({ forceTouch: true, nextSectionId: targetSection.id });
    }

    setDirection(nextIndex > currentSectionIndex ? 1 : -1);
    startTransition(() => {
      setCurrentSectionIndex(nextIndex);
    });
    scrollToSectionTop();
  }

  async function handleSubmit() {
    if (!survey || !response || !currentSection) {
      return;
    }

    try {
      clearRetryTimer();

      const pendingAnswers = Object.values(
        outboxRef.current?.responseId === response.id
          ? outboxRef.current.answers
          : {},
      );
      const submittedResponse = await submitMutation.mutateAsync({
        responseId: response.id,
        currentSectionId: currentSection.id,
        answers: pendingAnswers,
      });

      persistOutbox(null);
      setAnswers(submittedResponse.answers);
      setSurveyPageData({
        ...pageData,
        mode: "submitted",
        response: submittedResponse,
      });
      setShowCompletionConfetti(true);
    } catch {
      scheduleRetry(0);
    }
  }

  const involvementQuestion = survey?.sections
    .flatMap((section) => section.questions)
    .find((question) => question.key === "involvement");

  const involvementSelections = involvementQuestion
    ? (() => {
        const selectedKeys = readMultiSelectChoices(
          answers[involvementQuestion.id],
        );

        return involvementQuestion.options
          .filter((option) => selectedKeys.includes(option.key))
          .map((option) => option.label);
      })()
    : [];

  if (mode === "unconfigured" || mode === "missing") {
    return (
      <SurveyShell
        chrome={
          <SurveyHeroChrome
            surveyDescription={gate?.description ?? null}
            surveyTitle={gate?.title ?? "Crafter Station Survey"}
          />
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="survey-kicker flex items-center justify-between gap-4 text-[0.69rem] uppercase tracking-[0.26em]">
              <span>Estado</span>
              <span>4%</span>
            </div>
            <div className="survey-progress-track h-[2px] overflow-hidden">
              <div
                className="survey-progress-fill h-full transition-[width] duration-300 ease-out"
                style={{ width: "4%" }}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <h2 className="survey-heading max-w-3xl text-2xl leading-tight font-medium tracking-[-0.03em] text-foreground sm:text-3xl">
              {mode === "unconfigured"
                ? "Falta configurar el survey"
                : "No hay un survey activo"}
            </h2>
            {initialData.message ? (
              <p className="survey-body survey-muted max-w-2xl text-base leading-7">
                {initialData.message}
              </p>
            ) : null}
          </div>
          <div className="survey-muted border border-border bg-[var(--panel)] px-4 py-4 text-base leading-8 sm:px-5">
            {initialData.message}
          </div>
        </div>
      </SurveyShell>
    );
  }

  const shellTitle =
    mode === "gate"
      ? "Desbloquea el survey"
      : mode === "submitted"
        ? (survey?.completionTitle ?? "Gracias por responder")
        : (currentSection?.title ?? "Survey");

  const shellDescription =
    mode === "gate"
      ? "Usa el código para empezar o continuar donde lo dejaste."
      : mode === "submitted"
        ? null
        : (currentSection?.description ?? null);

  const surveyDescription =
    mode === "gate"
      ? (gate?.description ?? null)
      : mode === "submitted"
        ? "Tus respuestas quedaron guardadas. Si dejaste tus datos, te escribimos pronto."
        : "La encuesta es completamente anónima.";

  const isChatActive = mode === "survey" && surveyMode === "chat";
  const formProgressValue =
    mode === "survey" && survey
      ? (currentSectionIndex + 1) / survey.sections.length
      : 0.06;

  const compactChrome = (
    <SurveyCompactChrome
      actions={
        mode === "survey" && survey && response ? (
          <SurveyModeToggle
            mode={surveyMode}
            onChange={async (next) => {
              if (next === surveyMode) return;
              if (surveyMode === "form") {
                await flushDirty({ forceTouch: false });
              }
              updateSurveyMode(next);
              await refreshFromServer();
            }}
          />
        ) : undefined
      }
    />
  );

  const formFooter =
    mode === "survey" && surveyMode === "form" && survey && currentSection ? (
      <ProgressNav
        canGoBack={currentSectionIndex > 0}
        canGoNext={currentSectionIndex < survey.sections.length - 1}
        currentSectionIndex={currentSectionIndex}
        currentSectionId={currentSection.id}
        isSubmitting={submitPending}
        onBack={handleBack}
        onJump={handleSectionJump}
        onNext={handleNext}
        onSubmit={handleSubmit}
        saveLabel={null}
        sections={survey.sections.map((section) => ({
          id: section.id,
          title: section.title,
        }))}
        totalSections={survey.sections.length}
        answeredQuestions={
          currentSection.questions.filter((q) => {
            const answer = answers[q.id];
            return answer && (answer.valueText || answer.valueJson);
          }).length
        }
        totalQuestions={currentSection.questions.length}
      />
    ) : null;

  const reviewFooter =
    mode === "submitted" && survey && currentSection ? (
      <ProgressNav
        canGoBack={currentSectionIndex > 0}
        canGoNext={currentSectionIndex < survey.sections.length - 1}
        currentSectionIndex={currentSectionIndex}
        currentSectionId={currentSection.id}
        isReadOnly
        isSubmitting={false}
        onBack={handleBack}
        onJump={handleSectionJump}
        onNext={handleNext}
        onSubmit={handleSubmit}
        saveLabel={null}
        sections={survey.sections.map((section) => ({
          id: section.id,
          title: section.title,
        }))}
        totalSections={survey.sections.length}
        answeredQuestions={
          currentSection.questions.filter((q) => {
            const answer = answers[q.id];
            return answer && (answer.valueText || answer.valueJson);
          }).length
        }
        totalQuestions={currentSection.questions.length}
      />
    ) : null;

  if (mode === "gate") {
    return (
      <SurveyShell
        chrome={
          <SurveyHeroChrome
            surveyDescription={surveyDescription}
            surveyTitle={gate?.title ?? "Crafter Station Community Survey"}
          />
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="survey-kicker flex items-center justify-between gap-4 text-[0.69rem] uppercase tracking-[0.26em]">
              <span>Acceso</span>
              <span>6%</span>
            </div>
            <div className="survey-progress-track h-[2px] overflow-hidden">
              <div
                className="survey-progress-fill h-full transition-[width] duration-300 ease-out"
                style={{ width: "6%" }}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <h2 className="survey-heading max-w-3xl text-2xl leading-tight font-medium tracking-[-0.03em] text-foreground sm:text-3xl">
              {shellTitle}
            </h2>
            {shellDescription ? (
              <p className="survey-body survey-muted max-w-2xl text-base leading-7">
                {shellDescription}
              </p>
            ) : null}
          </div>
          <AccessGate
            code={unlockCode}
            error={unlockError}
            isPending={unlockPending}
            onCodeChange={setUnlockCode}
            onSubmit={handleUnlockSubmit}
          />
        </div>
      </SurveyShell>
    );
  }

  if (mode === "submitted") {
    if (!survey || !currentSection) {
      return null;
    }

    return (
      <SurveyShell
        compact
        chrome={compactChrome}
        contentRef={contentScrollRef}
        footer={reviewFooter ?? undefined}
      >
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-5 sm:px-6 sm:py-7">
          <div className="space-y-4">
            <CompletionScreen
              description={survey.completionDescription ?? null}
              showConfetti={showCompletionConfetti}
            />

            <div className="space-y-3">
              <div className="space-y-1">
                <h2 className="survey-heading max-w-3xl text-2xl leading-tight font-medium tracking-[-0.03em] text-foreground sm:text-3xl">
                  {currentSection.title}
                </h2>
                {currentSection.description ? (
                  <p className="survey-body survey-muted max-w-2xl text-sm leading-6 sm:text-base sm:leading-7">
                    {currentSection.description}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="space-y-4 pb-4">
            <AnimatePresence initial={false} mode="wait">
              <SectionPanel
                direction={reducedMotion ? 0 : direction}
                panelKey={currentSection.id}
              >
                {currentSection.questions.map((question) => (
                  <QuestionRenderer
                    answer={answers[question.id]}
                    key={question.id}
                    onChange={() => undefined}
                    question={question}
                    readOnly
                  />
                ))}
              </SectionPanel>
            </AnimatePresence>
          </div>
        </div>
      </SurveyShell>
    );
  }

  if (isChatActive && survey && response) {
    return (
      <SurveyChatPane
        chrome={compactChrome}
        onConversationUpdated={() => {
          void refreshFromServer();
        }}
        response={response}
      />
    );
  }

  if (mode === "survey" && surveyMode === "form" && survey && currentSection) {
    return (
      <SurveyShell
        chrome={compactChrome}
        compact
        contentRef={contentScrollRef}
        footer={formFooter ?? undefined}
      >
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-5 sm:px-6 sm:py-7">
          <>
            <div className="space-y-3">
              <div className="space-y-1">
                <h2 className="survey-heading max-w-3xl text-2xl leading-tight font-medium tracking-[-0.03em] text-foreground sm:text-3xl">
                  {currentSection.title}
                </h2>
                {currentSection.description ? (
                  <p className="survey-body survey-muted max-w-2xl text-sm leading-6 sm:text-base sm:leading-7">
                    {currentSection.description}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="space-y-4 pb-4">
              <AnimatePresence initial={false} mode="wait">
                <SectionPanel
                  direction={reducedMotion ? 0 : direction}
                  panelKey={currentSection.id}
                >
                  {currentSection.questions.map((question) => (
                    <QuestionRenderer
                      answer={answers[question.id]}
                      inputRef={
                        isTextEntryQuestion(question.questionType)
                          ? (node) => {
                              questionInputRefs.current.set(question.id, node);
                            }
                          : undefined
                      }
                      key={question.id}
                      onChange={(next) => updateAnswer(question.id, next)}
                      onSingleSelectCommit={() =>
                        handleSingleSelectCommit(question.id)
                      }
                      question={question}
                    />
                  ))}

                  {currentSection.key === "cierre" ? (
                    <div className="survey-muted rounded-[20px] border border-border/70 bg-background/70 px-4 py-4 text-sm leading-7 sm:px-5">
                      Tus respuestas son anónimas. Solo dejan de serlo si nos
                      compartes tu correo o tu número para que podamos
                      contactarte.
                    </div>
                  ) : null}
                </SectionPanel>
              </AnimatePresence>
            </div>
          </>
        </div>
      </SurveyShell>
    );
  }

  return null;
}
