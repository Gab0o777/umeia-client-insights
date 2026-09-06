/**
 * PatientJourneyFunnel — "El recorrido de tus X": árbol horizontal de dos
 * niveles, izquierda a derecha, UNA sola historia sin notas al pie:
 *
 *   conversaciones ─┬─→ avanzó ─┬─→ FAQ
 *                    │           ├─→ compra
 *                    │           ├─→ derivado a humano
 *                    │           └─→ (otros outcomes configurados)
 *                    └─→ siguen en curso
 *
 * "siguen en curso" cuelga de "conversaciones" con el mismo peso visual que
 * "avanzó" (no como una nota aparte) para que quede claro que ya está
 * incluido en el total de arriba, no que hay que sumarlo. Parte de
 * Actividad v2.
 *
 * `total`, `advanced`, `remainder` y `outcomes` deben salir de la MISMA
 * población (mismo lead_id, ver lead_tracking) para que las cuentas
 * cierren exactamente — es al caller (`ActividadV2`) a quien le toca
 * garantizar eso (incluido "FAQ", que ahora se calcula como el resto de
 * `advanced` que no llegó a ningún otro outcome, no como una cuenta
 * aparte de otro sistema — ver comentario en ActividadV2.tsx). Este
 * componente solo dibuja lo que le pasan y no calcula ningún %.
 */
import { Fragment } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FunnelNode {
  value: number;
  label: string;
  /** Texto del conector que lleva a este nodo (ej. "avanzó"). */
  verb: string;
  /** Ya formateado (ej. "70,9%"). Omitir cuando no hay una base confiable. */
  percent?: string | null;
}

export interface FunnelOutcome extends FunnelNode {
  accent: "info" | "success" | "warning";
}

const ACCENT_TEXT: Record<FunnelOutcome["accent"] | "muted", string> = {
  info: "text-info",
  success: "text-success",
  warning: "text-warning",
  muted: "text-muted-foreground",
};

function Connector({ verb, percent }: { verb: string; percent?: string | null }) {
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

function StepBox({
  value, label, accent, order,
}: {
  value: number;
  label: string;
  accent: FunnelOutcome["accent"] | "accent" | "muted";
  order?: number;
}) {
  return (
    <div className="shrink-0 rounded-xl border border-border px-4 py-2.5">
      {order !== undefined && (
        <div className="flex items-center gap-2">
          <div className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
            accent === "accent" ? "bg-accent text-accent-foreground" : "bg-info text-info-foreground"
          )}>
            {order}
          </div>
          <div className={cn("text-xl font-bold tracking-tight whitespace-nowrap", accent === "accent" ? "text-accent" : ACCENT_TEXT.info)}>
            {value.toLocaleString("es-AR")}
          </div>
        </div>
      )}
      {order === undefined && (
        <div className={cn("text-lg font-bold tracking-tight whitespace-nowrap", ACCENT_TEXT[accent as FunnelOutcome["accent"] | "muted"])}>
          {value.toLocaleString("es-AR")}
        </div>
      )}
      <div className={cn("text-xs text-muted-foreground whitespace-nowrap", order !== undefined && "mt-1")}>{label}</div>
    </div>
  );
}

export function PatientJourneyFunnel({
  title, total, advanced, remainder, outcomes,
}: {
  title: string;
  total: { value: number; label: string };
  advanced: FunnelNode;
  /** Rama hermana de `advanced`, directo de `total` — el resto que
   * todavía no avanzó (no perdido, sigue en curso). */
  remainder?: FunnelNode | null;
  /** Hijos de `advanced` — a qué llegaron los que avanzaron. */
  outcomes?: FunnelOutcome[];
}) {
  return (
    <div className="premium-card p-5">
      <div className="text-sm font-semibold mb-5">{title}</div>

      <div className="flex items-center gap-2 flex-wrap">
        <StepBox value={total.value} label={total.label} accent="accent" order={1} />

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Connector verb={advanced.verb} percent={advanced.percent} />
            <StepBox value={advanced.value} label={advanced.label} accent="info" order={2} />

            {outcomes && outcomes.length > 0 && (
              <div className="flex flex-col gap-2">
                {outcomes.map(outcome => (
                  <Fragment key={outcome.label}>
                    <div className="flex items-center gap-2">
                      <Connector verb={outcome.verb} percent={outcome.percent} />
                      <StepBox value={outcome.value} label={outcome.label} accent={outcome.accent} />
                    </div>
                  </Fragment>
                ))}
              </div>
            )}
          </div>

          {remainder && (
            <div className="flex items-center gap-2">
              <Connector verb={remainder.verb} percent={remainder.percent} />
              <StepBox value={remainder.value} label={remainder.label} accent="muted" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
