/**
 * PatientJourneyFunnel — "El recorrido de tus X": 2 o 3 pasos, cada uno en
 * su propia mini-card con borde (mismo lenguaje visual que un KpiCard).
 * Parte de Actividad v2.
 *
 * Sin porcentajes entre pasos, a propósito: "conversaciones" sale de
 * `chat_messages` (conversation_id) y "leads avanzaron"/el paso final salen
 * de `lead_tracking` (lead_id) — no hay columna que una esas dos tablas hoy,
 * así que ningún % entre esos pasos puede ser honesto. El % de "en qué
 * terminaron las consultas" SÍ es confiable y vive en `OutcomeBreakdown`
 * (mismo total para todas las partes) — mostrar OTRO % acá, con otra base,
 * para el mismo número, es lo que generaba números contradictorios.
 */
import { Fragment } from "react";
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

const VALUE_TEXT: Record<FunnelStep["accent"], string> = {
  accent: "text-accent",
  info: "text-info",
  success: "text-success",
};

export function PatientJourneyFunnel({
  title, steps, transitions,
}: {
  title: string;
  steps: FunnelStep[];
  /** Verbo corto por flecha, ej. ["avanzó", "llegó a Turnos"] — longitud steps.length - 1. */
  transitions: string[];
}) {
  return (
    <div className="premium-card p-5">
      <div className="text-sm font-semibold mb-5">{title}</div>
      <div className="flex items-center w-full gap-2">
        {steps.map((step, i) => (
          <Fragment key={step.label}>
            <div className="flex-1 min-w-0 rounded-xl border border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold", CIRCLE_BG[step.accent])}>
                  {i + 1}
                </div>
                <div className={cn("text-xl font-bold tracking-tight truncate", VALUE_TEXT[step.accent])}>
                  {step.value.toLocaleString("es-AR")}
                </div>
              </div>
              <div className="mt-1 text-xs text-muted-foreground truncate">{step.label}</div>
            </div>
            {i < steps.length - 1 && (
              <div className="flex flex-col items-center gap-1 text-muted-foreground shrink-0 px-1">
                <span className="text-xs font-semibold text-foreground text-center whitespace-nowrap">
                  {transitions[i]}
                </span>
                <div className="h-px w-8 bg-border" />
              </div>
            )}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
