"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AdminLoginPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? "Login failed.");
        return;
      }

      router.replace("/admin/overview");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <form
        className="w-full max-w-md space-y-5 rounded-[28px] border border-border/70 bg-card/70 p-6 shadow-sm"
        onSubmit={handleSubmit}
      >
        <div className="space-y-2">
          <p className="survey-kicker text-[0.64rem] uppercase tracking-[0.18em] text-muted-foreground">
            Admin
          </p>
          <h1 className="survey-heading text-3xl font-medium tracking-[-0.03em]">
            Survey analytics login
          </h1>
          <p className="survey-muted text-sm leading-6">
            Enter the admin access code to view internal survey analytics.
          </p>
        </div>

        <div className="space-y-2">
          <label className="survey-kicker text-[0.64rem] uppercase tracking-[0.18em] text-muted-foreground" htmlFor="admin-code">
            Admin access code
          </label>
          <Input
            id="admin-code"
            onChange={(event) => setCode(event.target.value)}
            placeholder="Enter admin access code"
            type="password"
            value={code}
          />
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Button className="w-full" disabled={pending || !code.trim()} type="submit">
          {pending ? "Entering..." : "Enter admin"}
        </Button>
      </form>
    </main>
  );
}
