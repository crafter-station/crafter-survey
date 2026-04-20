export function CompletionScreen({
  description,
}: {
  description: string | null;
}) {
  return (
    <div className="space-y-6">
      <div className="survey-pill inline-flex px-4 py-2 text-[0.72rem] uppercase tracking-[0.26em]">
        Respuestas enviadas
      </div>

      {description ? (
        <div className="survey-muted space-y-4 text-base leading-8 whitespace-pre-line">
          {description}
        </div>
      ) : null}

      <p className="survey-muted text-sm leading-6">
        Puedes revisar tus respuestas abajo en modo de solo lectura.
      </p>
    </div>
  );
}
