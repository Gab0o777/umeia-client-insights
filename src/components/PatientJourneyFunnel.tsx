/**
 * PatientJourneyFunnel — "El recorrido de tus pacientes": 3 pasos
 * (conversaciones → leads que avanzaron → llegaron al resultado final).
 * Parte de Actividad v2.
 *
 * Los 3 pasos miden cosas de naturaleza distinta (conversaciones, leads,
 * entradas a un estado), así que el % entre pasos es una referencia, no una
 * tasa de conversión estricta — puede superar el 100% si, por ejemplo,
 * varios leads sin conversación (creados a mano en el CRM) avanzaron en el
 * período. `pct()` lo formatea de forma legible y oculta el número (dejando
 * solo la flecha + el verbo) cuando está tan distorsionado que mostrarlo
 * confundiría más de lo que aclara.
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

function pct(from: number, to: number): string | null {
  if (from <= 0) return null;
  const ratio = (to / from) * 100;
  if (ratio > 200) return null;
  if (ratio < 1) return "<1%";
  return `${Math.round(ratio)}%`;
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
      <div className="flex items-start gap-2 overflow-x-auto pb-1">
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-start shrink-0">
            <div className="flex flex-col items-center gap-1.5 text-center w-[120px] shrink-0">
              <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold", CIRCLE_BG[step.accent])}>
                {i + 1}
              </div>
              <div className="text-xl font-bold tracking-tight">{step.value.toLocaleString("es-AR")}</div>
              <div className="text-xs text-muted-foreground leading-tight px-1">{step.label}</div>
            </div>
            {i < steps.length - 1 && (
              <div className="flex flex-col items-center gap-1 text-muted-foreground w-[130px] shrink-0 pt-1.5">
                <span className="flex min-h-[32px] items-center justify-center text-xs font-semibold text-foreground text-center leading-tight px-1">
                  {(() => {
                    const p = pct(step.value, steps[i + 1].value);
                    return p ? `${p} ${transitions[i]}` : transitions[i];
                  })()}
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
