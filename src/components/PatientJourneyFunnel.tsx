/**
 * PatientJourneyFunnel — "El recorrido de tus pacientes": 3 pasos
 * (conversaciones → leads que avanzaron → llegaron al resultado final) con
 * el % de conversión entre cada paso. Parte de Actividad v2.
 */
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

function pct(from: number, to: number): string {
  if (from <= 0) return "—";
  return `${(Math.round((to / from) * 1000) / 10).toLocaleString("es-AR")}%`;
}

export function PatientJourneyFunnel({
  steps, transitions,
}: {
  steps: FunnelStep[];
  /** Verbo corto para cada flecha, ej. ["avanzó", "llegó a Turnos"] — longitud steps.length - 1. */
  transitions: string[];
}) {
  return (
    <div className="premium-card p-5">
      <div className="text-sm font-semibold mb-5">El recorrido de tus pacientes</div>
      <div className="flex items-center gap-3 sm:gap-6 overflow-x-auto pb-1">
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-center gap-3 sm:gap-6 shrink-0">
            <div className="flex flex-col items-center gap-1.5 text-center min-w-[96px]">
              <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold", CIRCLE_BG[step.accent])}>
                {i + 1}
              </div>
              <div className="text-xl font-bold tracking-tight">{step.value.toLocaleString("es-AR")}</div>
              <div className="text-xs text-muted-foreground">{step.label}</div>
            </div>
            {i < steps.length - 1 && (
              <div className="flex flex-col items-center gap-1 text-muted-foreground min-w-[110px]">
                <span className="text-xs font-semibold text-foreground text-center leading-snug">
                  {pct(step.value, steps[i + 1].value)} {transitions[i]}
                </span>
                <ArrowRight className="h-4 w-4 shrink-0" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
