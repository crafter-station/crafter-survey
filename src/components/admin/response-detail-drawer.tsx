"use client";

import { useEffect, useState } from "react";

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

type ResponseDetail = {
  id: string;
  status: string;
  startedAt: string;
  lastSavedAt: string;
  submittedAt: string | null;
  sections: Array<{
    id: string;
    title: string;
    questions: Array<{
      id: string;
      key: string;
      prompt: string;
      questionType: string;
      answer: {
        valueText: string | null;
        valueJson: unknown;
      } | null;
    }>;
  }>;
};

export function ResponseDetailDrawer({
  responseId,
  open,
  onOpenChange,
}: {
  responseId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [detail, setDetail] = useState<ResponseDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !responseId) {
      return;
    }

    let cancelled = false;

    async function loadDetail() {
      setLoading(true);

      try {
        const response = await fetch(`/api/admin/responses/${responseId}`);
        if (!response.ok) {
          return;
        }

        const json = (await response.json()) as ResponseDetail;

        if (!cancelled) {
          setDetail(json);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDetail();

    return () => {
      cancelled = true;
    };
  }, [open, responseId]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Response detail</DrawerTitle>
          <DrawerDescription>
            {responseId ? `Inspecting response ${responseId}` : "Select a response"}
          </DrawerDescription>
        </DrawerHeader>
        <div className="max-h-[70vh] space-y-5 overflow-y-auto px-4 pb-6">
          {loading ? <p className="survey-muted text-sm">Loading...</p> : null}
          {!loading && detail
            ? detail.sections.map((section) => (
                <section className="space-y-3" key={section.id}>
                  <h3 className="survey-heading text-lg font-medium">{section.title}</h3>
                  <div className="space-y-3">
                    {section.questions.map((question) => (
                      <div className="rounded-[20px] border border-border/70 p-4" key={question.id}>
                        <p className="font-medium text-foreground">{question.prompt}</p>
                        <pre className="survey-muted mt-2 overflow-x-auto whitespace-pre-wrap text-sm">
                          {question.answer
                            ? JSON.stringify(
                                question.answer.valueText ?? question.answer.valueJson,
                                null,
                                2,
                              )
                            : "No answer"}
                        </pre>
                      </div>
                    ))}
                  </div>
                </section>
              ))
            : null}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
