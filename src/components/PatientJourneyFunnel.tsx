/**
 * PatientJourneyFunnel — "El recorrido de tus X": cadena horizontal
 * conversaciones → avanzaron, que se bifurca al final en los resultados
 * (compra, derivado a humano) apilados verticalmente uno al lado del otro
 * — así se lee de izquierda a derecha pero sin forzar dos resultados
 * distintos a compartir una sola caja. Parte de Actividad v2.
 *
 * `steps`, `outcomes` y `branches` deben salir de la MISMA población (mismo
 * lead_id, ver lead_tracking) para que las cuentas cierren — es al caller
 * (`ActividadV2`) a quien le toca garantizar eso, este componente solo
 * dibuja lo que le pasan y no calcula ningún %. Un dato de OTRA fuente (ej.
 * el log del menú guiado del bot, sin lead_id) va en `note`, fuera de la
 * cadena — mezclarlo como si fuera un paso más fue justamente el bug
 * original: dos porcentajes que sumaban más de 100% porque venían de
 * sistemas distintos disfrazados de partes de la misma torta.
 */
import { Fragment } from "react";
import { ArrowRight, CornerDownRight, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FunnelStep {
  label: string;
  value: number;
  accent: "accent" | "info";
}

export interface FunnelTransition {
  verb: string;
  /** Ya formateado (ej. "70,9%"). Omitir cuando no hay una base confiable. */
  percent?: string | null;
}

export interface FunnelOutcome {
  value: number;
  label: string;
  verb: string;
  percent?: string | null;
  accent: "success" | "warning";
}

export interface FunnelBranch {
  value: number;
  label: string;
  percent?: string | null;
  percentBasis: string;
}

export interface FunnelNote {
  value: number;
  label: string;
  percent?: string | null;
  /** Por qué esto NO es parte de la cadena de arriba. */
  hint: string;
}

const CIRCLE_BG: Record<FunnelStep["accent"], string> = {
  accent: "bg-accent text-accent-foreground",
  info: "bg-info text-info-foreground",
};

const STEP_TEXT: Record<FunnelStep["accent"], string> = {
  accent: "text-accent",
  info: "text-info",
};

const OUTCOME_TEXT: Record<FunnelOutcome["accent"], string> = {
  success: "text-success",
  warning: "text-warning",
};

function Connector({ verb, percent }: FunnelTransition) {
  return (
    <div className="flex items-center shrink-0">
      <div className="h-px w-3 bg-border" />
      <ArrowRight className="h-3 w-3 text-muted-foreground/60 -mx-0.5" />
      <div className="flex flex-col items-center gap-0.5 rounded-xl border border-border px-3 py-2">
        {percent && <span className="text-sm font-bold text-foreground whitespace-nowrap">{percent}</span>}
        <span className="text-[11px] text-muted-foreground whitespace-nowrap">{verb}</span>
      </div>
      <ArrowRight className="h-3 w-3 text-muted-foreground/60 -mx-0.5" />
      <div className="h-px w-3 bg-border" />
    </div>
  );
}

export function PatientJourneyFunnel({
  title, steps, transitions, outcomes, branches, note,
}: {
  title: string;
  steps: FunnelStep[];
  /** longitud steps.length - 1 */
  transitions: FunnelTransition[];
  /** Bifurcación al final de `steps` — cada uno es un resultado distinto
   * del último paso (ej. compra, derivado a humano), no pasos sucesivos
   * entre sí. */
  outcomes?: FunnelOutcome[];
  /** Ramas que cuelgan del primer paso (ej. "siguen en curso"). */
  branches?: FunnelBranch[];
  note?: FunnelNote | null;
}) {
  return (
    <div className="premium-card p-5">
      <div className="text-sm font-semibold mb-5">{title}</div>

      <div className="flex items-center w-full gap-2 flex-wrap">
        {steps.map((step, i) => (
          <Fragment key={step.label}>
            <div className="shrink-0 rounded-xl border border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold", CIRCLE_BG[step.accent])}>
                  {i + 1}
                </div>
                <div className={cn("text-xl font-bold tracking-tight whitespace-nowrap", STEP_TEXT[step.accent])}>
                  {step.value.toLocaleString("es-AR")}
                </div>
              </div>
              <div className="mt-1 text-xs text-muted-foreground whitespace-nowrap">{step.label}</div>
            </div>
            {i < steps.length - 1 && <Connector {...transitions[i]} />}
          </Fragment>
        ))}

        {outcomes && outcomes.length > 0 && (
          <div className="flex flex-col gap-2">
            {outcomes.map(outcome => (
              <div key={outcome.label} className="flex items-center gap-2">
                <Connector verb={outcome.verb} percent={outcome.percent} />
                <div className="shrink-0 rounded-xl border border-border px-4 py-2.5">
                  <div className={cn("text-lg font-bold tracking-tight whitespace-nowrap", OUTCOME_TEXT[outcome.accent])}>
                    {outcome.value.toLocaleString("es-AR")}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground whitespace-nowrap">{outcome.label}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {branches && branches.length > 0 && (
        <div className="mt-3 space-y-2">
          {branches.map(branch => (
            <div key={branch.label} className="flex items-start gap-2">
              <CornerDownRight className="h-4 w-4 text-muted-foreground/50 shrink-0 mt-2.5" />
              <div className="flex items-center gap-2">
                <div className="flex flex-col items-center gap-0.5 rounded-lg border border-dashed border-border px-2.5 py-1.5 shrink-0">
                  {branch.percent && (
                    <span className="text-xs font-bold text-foreground whitespace-nowrap">{branch.percent}</span>
                  )}
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">{branch.percentBasis}</span>
                </div>
                <ArrowRight className="h-3 w-3 text-muted-foreground/60 -mx-1" />
                <div className="rounded-xl border border-dashed border-border px-3 py-2">
                  <div className="text-lg font-bold text-muted-foreground">{branch.value.toLocaleString("es-AR")}</div>
                  <div className="text-[11px] text-muted-foreground whitespace-nowrap">{branch.label}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {note && (
        <div className="mt-4 pt-3 border-t border-border/60 flex items-start gap-2 text-xs text-muted-foreground">
          <HelpCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>
            Además, en cualquier punto de la conversación, <span className="font-semibold text-foreground">{note.value.toLocaleString("es-AR")}</span> {note.label}
            {note.percent && <> ({note.percent})</>} — {note.hint}
          </span>
        </div>
      )}
    </div>
  );
}
