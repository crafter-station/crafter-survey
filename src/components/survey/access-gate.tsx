import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
      {/* Input Section - Reduced prominence */}
      <div className="space-y-2">
        <label
          className="survey-muted block text-xs uppercase tracking-wider"
          htmlFor="survey-access-code"
        >
          Código de acceso
        </label>
        <Input
          autoCapitalize="characters"
          autoCorrect="off"
          className="survey-input h-11 px-4 text-sm uppercase tracking-wide"
          id="survey-access-code"
          onChange={(event) => onCodeChange(event.target.value)}
          placeholder="Ingresa tu código"
          spellCheck={false}
          type="text"
          value={code}
        />
      </div>

      {/* CTA Button - Hero element */}
      <div className="space-y-4">
        <Button
          className="w-full rounded-full px-8 py-6 text-lg font-semibold shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          disabled={isPending || !code.trim()}
          size="lg"
          type="submit"
        >
          {isPending ? "Entrando..." : "Entrar al survey"}
        </Button>

        {/* Helper text - Subtle, at the bottom */}
        <p className="survey-muted text-center text-xs leading-relaxed">
          Usa el código para continuar donde lo dejaste
        </p>
      </div>

      {error ? (
        <p className="survey-error rounded-lg px-4 py-3 text-sm">
          {error.includes("Too small") || error.includes("code")
            ? "Por favor ingresa un código de acceso válido"
            : error}
        </p>
      ) : null}
    </form>
  );
}
