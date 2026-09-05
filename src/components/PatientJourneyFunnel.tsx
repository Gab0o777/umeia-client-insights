/**
 * PatientJourneyFunnel — "El recorrido de tus pacientes": 2 o 3 pasos
 * (conversaciones → leads que avanzaron → [resultado final, si el tenant lo
 * tiene configurado]). Parte de Actividad v2.
 *
 * Sin porcentajes entre pasos a propósito: cada paso sale de una fuente
 * distinta (conversaciones de `chat_messages`, leads de `lead_tracking`,
 * cada uno con su propia forma de contar) y no hay garantía de que un paso
 * sea subconjunto del anterior, así que cualquier "% de conversión" entre
 * ellos puede superar el 100% sin ser un error — y de hecho lo hizo, más de
 * una vez. Mejor mostrar los números tal cual y dejar los porcentajes
 * confiables para `OutcomeBreakdown`, donde todas las partes salen del mismo
 * total y sí suman ~100%.
 */
import { Fragment } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FunnelStep {
  label: string;
  value: number;
  accent: "accent" | "info" | "success";
}

const CIRCLE_BG: Record<FunnelStep["accent"], string> = {
  accent: "bg-accent text-accent-foreground",
  info: "bg-info text-info-foreground",
  success: "bg-success text-success-foreground",
};

export function PatientJourneyFunnel({
  steps, transitions,
}: {
  steps: FunnelStep[];
  /** Verbo corto por flecha, ej. ["avanzó", "llegó a Turnos"] — longitud steps.length - 1. */
  transitions: string[];
}) {
  return (
    <div className="premium-card p-5">
      <div className="text-sm font-semibold mb-5">El recorrido de tus pacientes</div>
      <div className="flex items-start w-full">
        {steps.map((step, i) => (
          <Fragment key={step.label}>
            <div className="flex flex-col items-center gap-1.5 text-center flex-1 min-w-0 px-1">
              <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold", CIRCLE_BG[step.accent])}>
                {i + 1}
              </div>
              <div className="text-2xl font-bold tracking-tight">{step.value.toLocaleString("es-AR")}</div>
              <div className="text-xs text-muted-foreground leading-tight">{step.label}</div>
            </div>
            {i < steps.length - 1 && (
              <div className="flex flex-col items-center gap-1 text-muted-foreground flex-1 min-w-0 px-1 pt-2">
                <span className="flex min-h-[32px] items-center justify-center text-xs font-semibold text-foreground text-center leading-tight">
                  {transitions[i]}
                </span>
                <ArrowRight className="h-4 w-4 shrink-0" />
              </div>
            )}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
