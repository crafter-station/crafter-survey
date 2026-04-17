import type { FormEvent } from "react";

import { Button } from "@/components/ui/button";

export function AccessGate({
  code,
  error,
  isPending,
  onCodeChange,
  onSubmit,
}: {
  code: string;
  error: string | null;
  isPending: boolean;
  onCodeChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <div className="space-y-3">
        <label
          className="survey-kicker block text-[0.72rem] uppercase tracking-[0.26em]"
          htmlFor="survey-access-code"
        >
          Código de acceso
        </label>
        <input
          autoCapitalize="characters"
          autoCorrect="off"
          className="survey-input text-base uppercase tracking-[0.22em]"
          id="survey-access-code"
          onChange={(event) => onCodeChange(event.target.value)}
          placeholder="Ingresa tu código"
          spellCheck={false}
          type="text"
          value={code}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="survey-muted max-w-xl text-sm leading-7">
          Esto no es público. Usa el código y seguimos desde donde lo dejaste si
          ya empezaste antes.
        </p>

        <Button disabled={isPending} type="submit">
          {isPending ? "Entrando..." : "Entrar al survey"}
        </Button>
      </div>

      {error ? <p className="survey-error px-4 py-3 text-sm">{error}</p> : null}
    </form>
  );
}
