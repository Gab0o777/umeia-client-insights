/**
 * PatientJourneyFunnel — "El recorrido de tus pacientes": 3 pasos
 * (conversaciones → leads que avanzaron → llegaron al resultado final).
 * Parte de Actividad v2.
 *
 * Los pasos no viven todos en el mismo espacio de ids: "conversaciones" sale
 * de `chat_messages` (conversation_id) y "leads avanzaron" / el paso final
 * salen de `lead_tracking` (lead_id) — dos sistemas distintos, sin join
 * confiable entre ellos (ver docstring de `_pending_human_reply_count` en el
 * backend). Por eso el % entre esos dos pasos NO es una tasa de conversión
 * real y puede superar el 100% sin que sea un error — directamente no lo
 * mostramos (`showPercent: false`). Entre "leads avanzaron" y el paso final
 * sí vale mostrarlo: ambos salen de `lead_tracking`, mismo id de lead.
 */
import { Fragment } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FunnelStep {
  label: string;
  value: number;
  accent: "accent" | "info" | "success";
}

export interface FunnelTransition {
  verb: string;
  /** false cuando los dos pasos no son la misma unidad y un % sería engañoso. */
  showPercent?: boolean;
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
  /** longitud steps.length - 1 */
  transitions: FunnelTransition[];
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
                  {(() => {
                    const t = transitions[i];
                    if (t.showPercent === false) return t.verb;
                    const p = pct(step.value, steps[i + 1].value);
                    return p ? `${p} ${t.verb}` : t.verb;
                  })()}
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
