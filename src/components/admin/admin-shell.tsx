import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

import { AdminNav } from "./admin-nav";

export function AdminShell({
  children,
  currentPath,
  title,
}: {
  children: ReactNode;
  currentPath: string;
  title: string;
}) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <header className="space-y-4 rounded-[28px] border border-border/70 bg-card/70 p-5 shadow-sm backdrop-blur-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="survey-kicker text-[0.64rem] uppercase tracking-[0.18em] text-muted-foreground">
                Admin
              </p>
              <h1 className="survey-heading text-3xl font-medium tracking-[-0.03em]">
                {title}
              </h1>
            </div>
            <form action="/api/admin/logout" method="post">
              <Button type="submit" variant="outline">
                Logout
              </Button>
            </form>
          </div>
          <AdminNav currentPath={currentPath} />
        </header>
        {children}
      </div>
    </main>
  );
}
