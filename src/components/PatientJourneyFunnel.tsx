/**
 * PatientJourneyFunnel — "El recorrido de tus X": árbol horizontal de dos
 * niveles con conectores reales (línea que sale del borde de una caja y
 * llega al borde de la siguiente, no una flecha suelta en el medio):
 *
 *   conversaciones ─┬─→ avanzó ─┬─→ FAQ
 *                    │           ├─→ compra
 *                    │           ├─→ derivado a humano
 *                    │           └─→ (otros outcomes configurados)
 *                    └─→ siguen en curso
 *
 * "siguen en curso" cuelga de "conversaciones" con el mismo peso visual que
 * "avanzó" para que quede claro que ya está incluido en el total de
 * arriba, no que hay que sumarlo. Parte de Actividad v2.
 *
 * `total`, `advanced`, `remainder` y `outcomes` deben salir de la MISMA
 * población (mismo lead_id, ver lead_tracking) para que las cuentas
 * cierren exactamente — es al caller (`ActividadV2`) a quien le toca
 * garantizar eso (incluido "FAQ", que se calcula como el resto de
 * `advanced` que no llegó a ningún otro outcome, no como una cuenta
 * aparte de otro sistema — ver comentario en ActividadV2.tsx). Este
 * componente solo dibuja lo que le pasan y no calcula ningún %.
 */
import { Fragment } from "react";
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

function StepBox({
  value, label, accent, order,
}: {
  value: number;
  label: string;
  accent: FunnelOutcome["accent"] | "accent" | "muted";
  order?: number;
}) {
  return (
    <div className="shrink-0 rounded-xl border border-border bg-card px-4 py-2.5">
      {order !== undefined ? (
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
      ) : (
        <div className={cn("text-lg font-bold tracking-tight whitespace-nowrap", ACCENT_TEXT[accent as FunnelOutcome["accent"] | "muted"])}>
          {value.toLocaleString("es-AR")}
        </div>
      )}
      <div className={cn("text-xs text-muted-foreground whitespace-nowrap", order !== undefined && "mt-1")}>{label}</div>
    </div>
  );
}

/** Línea recta y corta — conecta una caja "trunk" con el spine de sus hijos. */
function StubLine() {
  return <div className="h-0.5 w-5 shrink-0 bg-border" />;
}

/** Badge de %+verbo que cuelga sobre el conector, entre el spine y la caja hija. */
function LinkBadge({ verb, percent }: { verb: string; percent?: string | null }) {
  return (
    <div className="mx-2 flex shrink-0 flex-col items-center gap-0.5 rounded-xl border border-border bg-card px-3 py-1.5">
      {percent && <span className="text-sm font-bold text-foreground whitespace-nowrap">{percent}</span>}
      <span className="text-[11px] text-muted-foreground whitespace-nowrap">{verb}</span>
    </div>
  );
}

/** Spine vertical + N ramas — cada rama es "línea desde el spine → badge →
 * caja hija (que puede tener, a su vez, su propio spine de hijos)". */
function Spine({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex flex-col gap-3.5 pl-5">
      <div className="absolute inset-y-0 left-0 w-0.5 bg-border" />
      {children}
    </div>
  );
}

function Branch({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex items-center">
      <div className="absolute -left-5 top-1/2 h-0.5 w-5 -translate-y-1/2 bg-border" />
      {children}
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

      <div className="overflow-x-auto">
        <div className="flex items-center w-fit">
          <StepBox value={total.value} label={total.label} accent="accent" order={1} />
          <StubLine />

          <Spine>
            <Branch>
              <LinkBadge verb={advanced.verb} percent={advanced.percent} />
              <StepBox value={advanced.value} label={advanced.label} accent="info" order={2} />

              {outcomes && outcomes.length > 0 && (
                <>
                  <StubLine />
                  <Spine>
                    {outcomes.map(outcome => (
                      <Fragment key={outcome.label}>
                        <Branch>
                          <LinkBadge verb={outcome.verb} percent={outcome.percent} />
                          <StepBox value={outcome.value} label={outcome.label} accent={outcome.accent} />
                        </Branch>
                      </Fragment>
                    ))}
                  </Spine>
                </>
              )}
            </Branch>

            {remainder && (
              <Branch>
                <LinkBadge verb={remainder.verb} percent={remainder.percent} />
                <StepBox value={remainder.value} label={remainder.label} accent="muted" />
              </Branch>
            )}
          </Spine>
        </div>
      </div>
    </div>
  );
}
