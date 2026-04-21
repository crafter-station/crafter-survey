"use client";

import { useState } from "react";

import { ResponseDetailDrawer } from "@/components/admin/response-detail-drawer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ResponsesPageClient({
  responses,
}: {
  responses: Array<{
    id: string;
    status: string;
    startedAt: Date;
    lastSavedAt: Date;
    submittedAt: Date | null;
    answerCount: number;
  }>;
}) {
  const [selectedResponseId, setSelectedResponseId] = useState<string | null>(null);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Responses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {responses.map((response) => (
              <button
                className="flex w-full flex-col gap-2 rounded-[20px] border border-border/70 p-4 text-left transition-colors hover:bg-accent/60 sm:flex-row sm:items-center sm:justify-between"
                key={response.id}
                onClick={() => setSelectedResponseId(response.id)}
                type="button"
              >
                <div>
                  <p className="font-medium text-foreground">{response.id}</p>
                  <p className="survey-muted text-sm">
                    {response.status} · {response.answerCount} answers
                  </p>
                </div>
                <p className="survey-muted text-sm">
                  last saved {response.lastSavedAt.toISOString()}
                </p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <ResponseDetailDrawer
        onOpenChange={(open) => {
          if (!open) {
            setSelectedResponseId(null);
          }
        }}
        open={Boolean(selectedResponseId)}
        responseId={selectedResponseId}
      />
    </>
  );
}
