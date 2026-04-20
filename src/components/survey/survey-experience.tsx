"use client";

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
  SaveRequestBody,
  SerializedAnswer,
  SurveyPageData,
} from "@/types/survey";

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

type SaveState = "idle" | "saving" | "saved" | "error";

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

function getSaveLabel(saveState: SaveState) {
  switch (saveState) {
    case "saving":
      return "Guardando cambios...";
    case "saved":
      return "Guardado en la base de datos.";
    case "error":
      return "No pudimos guardar. Tus cambios siguen aquí y reintentaremos.";
    case "idle":
      return "Tus respuestas se guardan automáticamente mientras avanzas.";
  }
}

export function SurveyExperience({
  initialData,
}: {
  initialData: SurveyPageData;
}) {
  const reducedMotion = useReducedMotion();

  const [mode, setMode] = useState(initialData.mode);
  const [gate, setGate] = useState(initialData.gate);
  const [survey, setSurvey] = useState(initialData.survey);
  const [response, setResponse] = useState(initialData.response);
  const [answers, setAnswers] = useState<Record<string, SerializedAnswer>>(
    initialData.response?.answers ?? {},
  );
  const [currentSectionIndex, setCurrentSectionIndex] = useState(
    getInitialSectionIndex(
      initialData.survey,
      initialData.response?.currentSectionId,
    ),
  );
  const [saveState, setSaveState] = useState<SaveState>(
    initialData.mode === "survey" ? "saved" : "idle",
  );
  const [unlockCode, setUnlockCode] = useState("");
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [unlockPending, setUnlockPending] = useState(false);
  const [submitPending, setSubmitPending] = useState(false);
  const [direction, setDirection] = useState(1);
  const [surveyMode, setSurveyMode] = useState<SurveyMode>("chat");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(MODE_STORAGE_KEY);
    if (stored === "chat" || stored === "form") {
      setSurveyMode(stored);
    }
  }, []);

  function updateSurveyMode(nextMode: SurveyMode) {
    setSurveyMode(nextMode);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(MODE_STORAGE_KEY, nextMode);
    }
  }

  const dirtyQuestionIdsRef = useRef(new Set<string>());
  const contentScrollRef = useRef<HTMLDivElement | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveStateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveQueueRef = useRef(Promise.resolve(true));

  const currentSection = survey?.sections[currentSectionIndex] ?? null;
  const saveLabel = getSaveLabel(saveState);

  const setSavedState = useEffectEvent(() => {
    setSaveState("saved");

    if (saveStateTimerRef.current) {
      clearTimeout(saveStateTimerRef.current);
    }

    saveStateTimerRef.current = setTimeout(() => {
      setSaveState("idle");
    }, 1800);
  });

  const refreshFromServer = useEffectEvent(async () => {
    if (mode !== "survey" || !response) return;
    try {
      const url = new URL("/api/survey/state", window.location.origin);
      url.searchParams.set("responseId", response.id);
      const res = await fetch(url.toString(), { method: "GET" });
      if (!res.ok) return;
      const data = (await res.json().catch(() => null)) as {
        survey?: SurveyPageData["survey"];
        response?: SurveyPageData["response"];
      } | null;
      if (!data?.survey || !data.response) return;
      hydrateFromServer({
        mode: data.response.status === "submitted" ? "submitted" : "survey",
        gate,
        survey: data.survey,
        response: data.response,
        message: null,
      });
    } catch {
      // ignore
    }
  });

  const hydrateFromServer = useEffectEvent((nextData: SurveyPageData) => {
    setMode(nextData.mode);
    setGate(nextData.gate);
    setSurvey(nextData.survey);
    setResponse(nextData.response);
    setAnswers(nextData.response?.answers ?? {});
    setCurrentSectionIndex(
      getInitialSectionIndex(
        nextData.survey,
        nextData.response?.currentSectionId,
      ),
    );
    dirtyQuestionIdsRef.current.clear();
    setUnlockError(null);
    setSavedState();
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
      if (!response || mode !== "survey") {
        return true;
      }

      const dirtyIds = Array.from(dirtyQuestionIdsRef.current);
      const targetSectionId = nextSectionId ?? currentSection?.id ?? null;

      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }

      if (!dirtyIds.length && !forceTouch) {
        return true;
      }

      const payload: SaveRequestBody = {
        responseId: response.id,
        currentSectionId: targetSectionId,
        answers: dirtyIds.map((questionId) => {
          const answer = answers[questionId];

          return {
            questionId,
            valueText: answer?.valueText ?? null,
            valueJson: answer?.valueJson ?? null,
            clientUpdatedAt:
              answer?.clientUpdatedAt ?? new Date().toISOString(),
          };
        }),
      };

      const execute = async () => {
        try {
          setSaveState("saving");

          const saveRequest = fetch("/api/survey/save", {
            body: JSON.stringify(payload),
            headers: {
              "content-type": "application/json",
            },
            keepalive,
            method: "POST",
          });

          if (keepalive) {
            void saveRequest;
            return true;
          }

          const saveResponse = await saveRequest;
          const data = (await saveResponse.json().catch(() => null)) as {
            lastSavedAt?: string;
            message?: string;
            currentSectionId?: string | null;
          } | null;

          if (!saveResponse.ok) {
            throw new Error(data?.message ?? "Failed to save the survey.");
          }

          for (const dirtyId of dirtyIds) {
            dirtyQuestionIdsRef.current.delete(dirtyId);
          }

          setResponse((current) =>
            current
              ? {
                  ...current,
                  currentSectionId: data?.currentSectionId ?? targetSectionId,
                  lastSavedAt: data?.lastSavedAt ?? current.lastSavedAt,
                }
              : current,
          );

          setSavedState();
          return true;
        } catch {
          setSaveState("error");
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
    }
  });

  const sendKeepaliveSave = useEffectEvent(() => {
    if (
      !response ||
      mode !== "survey" ||
      dirtyQuestionIdsRef.current.size === 0
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

      if (saveStateTimerRef.current) {
        clearTimeout(saveStateTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        sendKeepaliveSave();
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
  }, [sendKeepaliveSave]);

  function updateAnswer(
    questionId: string,
    value: { valueText: string | null; valueJson: JsonValue | null },
  ) {
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
    dirtyQuestionIdsRef.current.add(questionId);
    scheduleAutosave();
  }

  async function handleUnlockSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUnlockPending(true);
    setUnlockError(null);

    try {
      const unlockResponse = await fetch("/api/survey/unlock", {
        body: JSON.stringify({ code: unlockCode }),
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
        setUnlockError(payload?.message ?? "No pudimos desbloquear el survey.");
        return;
      }

      hydrateFromServer({
        mode: payload.response.status === "submitted" ? "submitted" : "survey",
        gate,
        survey: payload.survey,
        response: payload.response,
        message: null,
      });
      setUnlockCode("");
    } finally {
      setUnlockPending(false);
    }
  }

  async function handleBack() {
    if (!survey || !response || currentSectionIndex === 0) {
      return;
    }

    const nextIndex = currentSectionIndex - 1;
    const targetSection = survey.sections[nextIndex];

    const didSave = await flushDirty({
      forceTouch: true,
      nextSectionId: targetSection.id,
    });

    if (!didSave) {
      return;
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

    const didSave = await flushDirty({
      forceTouch: true,
      nextSectionId: targetSection?.id ?? currentSection.id,
    });

    if (!didSave || !targetSection) {
      return;
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
    const didSave = await flushDirty({
      forceTouch: true,
      nextSectionId: targetSection.id,
    });

    if (!didSave) {
      return;
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

    setSubmitPending(true);

    try {
      const dirtyIds = Array.from(dirtyQuestionIdsRef.current);
      const submitResponse = await fetch("/api/survey/submit", {
        body: JSON.stringify({
          responseId: response.id,
          currentSectionId: currentSection.id,
          answers: dirtyIds.map((questionId) => {
            const answer = answers[questionId];

            return {
              questionId,
              valueText: answer?.valueText ?? null,
              valueJson: answer?.valueJson ?? null,
              clientUpdatedAt:
                answer?.clientUpdatedAt ?? new Date().toISOString(),
            };
          }),
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });

      const payload = (await submitResponse.json().catch(() => null)) as {
        message?: string;
        response?: SurveyPageData["response"];
      } | null;

      if (!submitResponse.ok || !payload?.response) {
        setSaveState("error");
        return;
      }

      dirtyQuestionIdsRef.current.clear();
      setResponse(payload.response);
      setMode("submitted");
      setSavedState();
    } finally {
      setSubmitPending(false);
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
        : "Anónima, privada y con guardado automático en cada etapa.";

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
        isBusy={submitPending || saveState === "saving"}
        onBack={handleBack}
        onJump={handleSectionJump}
        onNext={handleNext}
        onSubmit={handleSubmit}
        saveLabel={saveLabel}
        sections={survey.sections.map((section) => ({
          id: section.id,
          title: section.title,
        }))}
        totalSections={survey.sections.length}
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
    return (
      <SurveyShell compact chrome={compactChrome}>
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 py-5 sm:px-6 sm:py-7">
          <div className="space-y-1">
            <p className="survey-kicker text-[0.66rem] uppercase tracking-[0.22em] text-muted-foreground">
              Cierre
            </p>
            <h2 className="survey-heading max-w-3xl text-2xl leading-tight font-medium tracking-[-0.03em] text-foreground sm:text-3xl">
              {shellTitle}
            </h2>
          </div>
          <CompletionScreen
            description={survey?.completionDescription ?? null}
          />
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
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="survey-kicker flex items-center justify-between gap-4 text-[0.69rem] uppercase tracking-[0.26em] text-muted-foreground">
                <span>{`Sección ${currentSectionIndex + 1}`}</span>
                <span>{Math.round(formProgressValue * 100)}%</span>
              </div>
              <div className="survey-progress-track h-[2px] overflow-hidden rounded-full">
                <div
                  className="survey-progress-fill h-full transition-[width] duration-300 ease-out"
                  style={{
                    width: `${Math.max(formProgressValue, 0.04) * 100}%`,
                  }}
                />
              </div>
            </div>

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
                    key={question.id}
                    onChange={(next) => updateAnswer(question.id, next)}
                    onSingleSelectCommit={() =>
                      handleSingleSelectCommit(question.id)
                    }
                    question={question}
                  />
                ))}

                {currentSection.key === "cierre" &&
                involvementSelections.length > 0 ? (
                  <div className="survey-muted rounded-[20px] border border-border/70 bg-background/70 px-4 py-4 text-sm leading-7 sm:px-5">
                    Si nos dejas tu correo, podemos escribirte directamente
                    sobre: {involvementSelections.join(", ")}.
                  </div>
                ) : null}
              </SectionPanel>
            </AnimatePresence>
          </div>
        </div>
      </SurveyShell>
    );
  }

  return null;
}
