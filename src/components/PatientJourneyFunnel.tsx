/**
 * PatientJourneyFunnel — "El recorrido de tus X": 2 o 3 pasos, cada uno en
 * su propia mini-card con borde (mismo lenguaje visual que un KpiCard).
 * Parte de Actividad v2.
 *
 * El % es opcional a propósito: el caller (`ActividadV2`) es quien decide si
 * hay una comparación confiable para mostrar, y con qué fórmula — este
 * componente no calcula nada, solo muestra el string ya armado. Así evitamos
 * que el componente invente un % con una base distinta a la que ya se
 * muestra en otro lado de la página (eso fue justamente el bug: la misma
 * cifra mostrando 5,6% acá y 4,1% en OutcomeBreakdown).
 */
import { Fragment } from "react";
import { ArrowRight, CornerDownRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FunnelStep {
  label: string;
  value: number;
  accent: "accent" | "info" | "success";
}

export interface FunnelTransition {
  verb: string;
  /** Ya formateado (ej. "51,6%"). Omitir cuando no hay una base confiable. */
  percent?: string | null;
}

export interface FunnelBranch {
  value: number;
  label: string;
  /** Ya formateado. Omitir cuando no hay una base confiable. */
  percent?: string | null;
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
  title, steps, transitions, branch,
}: {
  title: string;
  steps: FunnelStep[];
  /** longitud steps.length - 1 */
  transitions: FunnelTransition[];
  /** Bifurcación opcional que sale del primer paso — para conversaciones
   * que terminaron en un resultado distinto del "avanzó" principal (ej.
   * consultas de FAQ resueltas sin mover al lead), así el hueco entre el %
   * que avanzó y el 100% queda explicado en vez de mostrarse como si nada
   * hubiera pasado con esas conversaciones. */
  branch?: FunnelBranch | null;
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
              <div className="flex items-center shrink-0">
                <div className="h-px w-3 bg-border" />
                <ArrowRight className="h-3 w-3 text-muted-foreground/60 -mx-0.5" />
                <div className="flex flex-col items-center gap-0.5 rounded-xl border border-border px-3 py-2">
                  {transitions[i].percent && (
                    <span className="text-sm font-bold text-foreground whitespace-nowrap">{transitions[i].percent}</span>
                  )}
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">{transitions[i].verb}</span>
                </div>
                <ArrowRight className="h-3 w-3 text-muted-foreground/60 -mx-0.5" />
                <div className="h-px w-3 bg-border" />
              </div>
            )}
          </Fragment>
        ))}
      </div>

      {branch && (
        <div className="flex items-start gap-2 mt-3">
          <CornerDownRight className="h-4 w-4 text-muted-foreground/50 shrink-0 mt-2.5" />
          <div className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-0.5 rounded-lg border border-dashed border-border px-2.5 py-1.5 shrink-0">
              {branch.percent && (
                <span className="text-xs font-bold text-foreground whitespace-nowrap">{branch.percent}</span>
              )}
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">no necesitó avanzar</span>
            </div>
            <ArrowRight className="h-3 w-3 text-muted-foreground/60 -mx-1" />
            <div className="rounded-xl border border-dashed border-border px-3 py-2">
              <div className="text-lg font-bold text-muted-foreground">{branch.value.toLocaleString("es-AR")}</div>
              <div className="text-[11px] text-muted-foreground whitespace-nowrap">{branch.label}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
