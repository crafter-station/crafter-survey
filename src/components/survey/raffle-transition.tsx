"use client";

import { Button } from "@/components/ui/button";

interface RaffleTransitionProps {
	onContinue: () => void;
	onSubmit: () => void;
	isSubmitting: boolean;
}

export function RaffleTransition({
	onContinue,
	onSubmit,
	isSubmitting,
}: RaffleTransitionProps) {
	return (
		<div className="space-y-6">
			<div className="space-y-3">
				<h2 className="survey-heading max-w-3xl text-2xl leading-tight font-medium tracking-[-0.03em] text-foreground sm:text-3xl">
					Gracias. Ya nos ayudaste un montón.
				</h2>
				<p className="survey-body survey-muted max-w-2xl text-base leading-7">
					¿Quieres participar en el sorteo de{" "}
					<strong className="font-semibold text-foreground">
						$100 USD en Cursor
					</strong>{" "}
					y ayudarnos a planear mejor los próximos meses?
				</p>
				<p className="survey-muted text-sm leading-6">
					Sortearemos cuando lleguemos a 100 respuestas. Solo te tomará 1 minuto
					más.
				</p>
			</div>

			<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
				<Button
					className="flex-1 rounded-full px-4 py-3 text-sm tracking-wide sm:flex-none"
					disabled={isSubmitting}
					onClick={onContinue}
					size="lg"
				>
					Sí, participar en el sorteo
				</Button>
				<Button
					className="flex-1 rounded-full px-4 py-3 text-sm tracking-wide sm:flex-none"
					disabled={isSubmitting}
					onClick={onSubmit}
					size="lg"
					variant="outline"
				>
					{isSubmitting ? "Enviando..." : "No, enviar ahora"}
				</Button>
			</div>
		</div>
	);
}
