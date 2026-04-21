"use client";

import { useEffect, useState } from "react";
import Confetti from "react-confetti";

const CONFETTI_COLORS = [
  "#f59e0b",
  "#fb7185",
  "#22c55e",
  "#38bdf8",
  "#a78bfa",
  "#f97316",
];

function useViewportSize() {
  const [size, setSize] = useState({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    function updateSize() {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    updateSize();
    window.addEventListener("resize", updateSize);

    return () => {
      window.removeEventListener("resize", updateSize);
    };
  }, []);

  return size;
}

export function CompletionScreen({
  description,
  showConfetti = false,
}: {
  description: string | null;
  showConfetti?: boolean;
}) {
  const { width, height } = useViewportSize();

  return (
    <div className="relative space-y-6 overflow-hidden">
      {showConfetti && width > 0 && height > 0 ? (
        <Confetti
          className="pointer-events-none"
          colors={CONFETTI_COLORS}
          gravity={0.18}
          numberOfPieces={180}
          recycle={false}
          width={width}
          height={height}
        />
      ) : null}

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
