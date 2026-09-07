/**
 * PipelineDetailPanel — "Detalle por pipeline": colapsado por defecto, tabs
 * con cada pipeline del tenant (sin "Todos" — el orden y nombre de etapas
 * solo tiene sentido dentro de UN pipeline), preseleccionando el primero
 * apenas carga. Panel rico (sentencia + cards + gráfico diario + alertas +
 * movimientos recientes) alimentado por `usePipelineDetail`. Parte de
 * Actividad v2.
 */
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ChevronDown, ExternalLink } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { cn } from "@/lib/utils";
import { LeadStatusReport } from "@/hooks/useLeadStatusReport";
import { usePipelineDetail, PipelineStage } from "@/hooks/usePipelineDetail";
import { useAuth } from "@/context/AuthContext";

const STAGE_COLORS = [
  { text: "text-accent", bg: "bg-accent/15 text-accent", bar: "hsl(var(--accent))" },
  { text: "text-info", bg: "bg-info/15 text-info", bar: "hsl(var(--info))" },
  { text: "text-success", bg: "bg-success/15 text-success", bar: "hsl(var(--success))" },
  { text: "text-warning", bg: "bg-warning/15 text-warning", bar: "hsl(var(--warning))" },
];

function changePct(current: number, prev: number): number | null {
  if (prev <= 0) return null;
  return Math.round(((current - prev) / prev) * 1000) / 10;
}

function ChangeBadge({ pct }: { pct: number | null }) {
  if (pct === null) return null;
  return (
    <span className={cn("text-xs font-semibold", pct >= 0 ? "text-success" : "text-destructive")}>
      {pct >= 0 ? "▲" : "▼"} {Math.abs(pct).toLocaleString("es-AR")}%
    </span>
  );
}

/** "467 leads ingresaron por Bot - Llegada. 358 pasaron por Atención humana
 * y 282 fueron movidos a Turnos." — genérico para cualquier cantidad de
 * etapas (no asume exactamente 3). */
function stagesSentence(stages: PipelineStage[], noun: string): string {
  if (stages.length === 0) return "";
  const [first, ...rest] = stages;
  let sentence = `${first.period_total.toLocaleString("es-AR")} ${noun} ingresaron por ${first.status_name ?? "la primera etapa"}.`;
  if (rest.length > 0) {
    const last = rest[rest.length - 1];
    const middleParts = rest.slice(0, -1).map(s => `${s.period_total.toLocaleString("es-AR")} pasaron por ${s.status_name}`);
    const parts = [...middleParts, `${last.period_total.toLocaleString("es-AR")} fueron movidos a ${last.status_name}`];
    sentence += ` ${parts.join(", ").replace(/, ([^,]*)$/, " y $1")}.`;
  }
  return sentence;
}

function StageRow({ stages }: { stages: PipelineStage[] }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {stages.map((stage, i) => {
        const color = STAGE_COLORS[i % STAGE_COLORS.length];
        return (
          <div key={stage.status_id} className="flex items-center gap-2">
            <div className="shrink-0 rounded-xl border border-border bg-card px-4 py-3">
              <div className="flex items-center gap-2">
                <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", color.bg)}>
                  <div className={cn("h-2.5 w-2.5 rounded-full", color.text, "bg-current")} />
                </div>
                <div className={cn("text-xl font-bold tracking-tight whitespace-nowrap", color.text)}>
                  {stage.period_total.toLocaleString("es-AR")}
                </div>
              </div>
              <div className="mt-1 text-xs text-muted-foreground whitespace-nowrap">{stage.status_name}</div>
              <div className="mt-1"><ChangeBadge pct={changePct(stage.period_total, stage.prev_period_total)} /></div>
            </div>
            {i < stages.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />}
          </div>
        );
      })}
    </div>
  );
}

function DailyChart({ stages, daily }: { stages: PipelineStage[]; daily: { date: string; status_id: number; total: number }[] }) {
  const data = useMemo(() => {
    const byDate = new Map<string, Record<string, number>>();
    for (const point of daily) {
      const stageName = stages.find(s => s.status_id === point.status_id)?.status_name ?? String(point.status_id);
      if (!byDate.has(point.date)) byDate.set(point.date, {});
      byDate.get(point.date)![stageName] = point.total;
    }
    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, counts]) => ({
        date: new Date(`${date}T00:00:00Z`).toLocaleDateString("es-AR", { weekday: "short", timeZone: "UTC" }),
        ...counts,
      }));
  }, [stages, daily]);

  if (data.length === 0) {
    return <div className="py-8 text-center text-xs text-muted-foreground">Sin movimientos en el período seleccionado</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
        />
        {stages.map((stage, i) => (
          <Bar
            key={stage.status_id}
            dataKey={stage.status_name ?? String(stage.status_id)}
            stackId="stages"
            fill={STAGE_COLORS[i % STAGE_COLORS.length].bar}
            radius={i === stages.length - 1 ? [3, 3, 0, 0] : undefined}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

function StaleAlerts({ stale, crmSubdomain, pipelineId }: {
  stale: { status_id: number; status_name: string | null; count: number }[];
  crmSubdomain: string | null;
  pipelineId: number;
}) {
  if (stale.length === 0) {
    return <div className="text-xs text-muted-foreground">Sin alertas — ningún lead lleva más de 24h en la misma etapa.</div>;
  }
  return (
    <div className="space-y-2">
      {stale.map(s => {
        const href = crmSubdomain ? `https://${crmSubdomain}.kommo.com/leads/pipeline/${pipelineId}` : null;
        return (
          <div key={s.status_id} className="flex items-center justify-between gap-3 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2.5">
            <span className="text-xs text-foreground">
              <span className="font-bold">{s.count.toLocaleString("es-AR")}</span> leads llevan más de 24h en <span className="font-semibold">{s.status_name}</span>
            </span>
            {href && (
              <a href={href} target="_blank" rel="noreferrer" className="shrink-0 rounded-md bg-warning/20 px-2.5 py-1 text-xs font-semibold text-warning hover:bg-warning/30 transition-colors">
                Ver leads
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}

function RecentMovementsTable({ movements, crmSubdomain }: {
  movements: { at: string; lead_id: number; from_status_name: string | null; to_status_name: string | null }[];
  crmSubdomain: string | null;
}) {
  if (movements.length === 0) {
    return <div className="text-xs text-muted-foreground">Sin movimientos recientes.</div>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-muted-foreground border-b border-border">
            <th className="pb-2 pr-4 font-medium">Hora</th>
            <th className="pb-2 pr-4 font-medium">Lead</th>
            <th className="pb-2 pr-4 font-medium">Movimiento</th>
            <th className="pb-2 font-medium">Acción</th>
          </tr>
        </thead>
        <tbody>
          {movements.map((m, i) => {
            const href = crmSubdomain ? `https://${crmSubdomain}.kommo.com/leads/detail/${m.lead_id}` : null;
            const date = new Date(m.at);
            const isToday = date.toDateString() === new Date().toDateString();
            const when = isToday
              ? `Hoy, ${date.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}`
              : date.toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
            return (
              <tr key={`${m.lead_id}-${m.at}-${i}`} className="border-b border-border/50 last:border-0">
                <td className="py-2 pr-4 text-muted-foreground whitespace-nowrap">{when}</td>
                <td className="py-2 pr-4 whitespace-nowrap">Lead #{m.lead_id}</td>
                <td className="py-2 pr-4 whitespace-nowrap">
                  <span className="text-muted-foreground">{m.from_status_name}</span> → <span className="text-foreground font-medium">{m.to_status_name}</span>
                </td>
                <td className="py-2">
                  {href ? (
                    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-info hover:underline">
                      Ver conversación <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PipelineRichView({ apiSlug, pipelineId, hours, noun }: { apiSlug?: string; pipelineId: number; hours: number; noun: string }) {
  const detail = usePipelineDetail(apiSlug, pipelineId, hours);

  if (detail.loading) {
    return <div className="py-10 text-center text-xs text-muted-foreground">Cargando…</div>;
  }
  if (detail.stages.length === 0) {
    return <div className="py-10 text-center text-xs text-muted-foreground">Sin etapas sincronizadas para este pipeline todavía.</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="max-w-2xl">
          <div className="text-base font-semibold">{detail.pipelineName}</div>
          <p className="mt-1 text-sm text-muted-foreground">{stagesSentence(detail.stages, noun)}</p>
        </div>
        <div className="text-right shrink-0">
          <div className="flex items-baseline justify-end gap-2">
            <span className="text-xl font-bold">{detail.totalMovements.toLocaleString("es-AR")}</span>
            <span className="text-xs text-muted-foreground">movimientos</span>
          </div>
          <div className="mt-0.5"><ChangeBadge pct={changePct(detail.totalMovements, detail.totalMovementsPrev)} /></div>
          <p className="mt-1 max-w-[220px] text-[11px] text-muted-foreground">
            Los valores representan movimientos entre columnas. Un mismo lead puede aparecer en más de una etapa.
          </p>
        </div>
      </div>

      <StageRow stages={detail.stages} />

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <div className="text-sm font-semibold mb-3">Actividad por día</div>
          <DailyChart stages={detail.stages} daily={detail.daily} />
        </div>
        <div>
          <div className="text-sm font-semibold mb-3">Dónde revisar</div>
          <StaleAlerts stale={detail.stale} crmSubdomain={detail.crmSubdomain} pipelineId={pipelineId} />
        </div>
      </div>

      <div>
        <div className="text-sm font-semibold mb-3">Movimientos recientes</div>
        <RecentMovementsTable movements={detail.recentMovements} crmSubdomain={detail.crmSubdomain} />
      </div>
    </div>
  );
}

export function PipelineDetailPanel({ report, hours }: { report: LeadStatusReport; hours: number }) {
  const { tenant } = useAuth();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const noun = tenant?.vertical === "clinica" ? "pacientes" : tenant?.vertical === "educacion" ? "alumnos" : "leads";

  // Sin tab "Todos": el panel siempre muestra un pipeline puntual (el orden
  // de etapas no tiene sentido mezclando varios), así que apenas cargan los
  // pipelines del tenant se preselecciona el primero en vez de dejar el
  // panel vacío hasta que el usuario haga click.
  useEffect(() => {
    if (selected === null && report.pipelines.length > 0) {
      setSelected(report.pipelines[0].pipeline_id);
    }
  }, [report.pipelines, selected]);

  return (
    <div className="premium-card p-5">
      <button onClick={() => setOpen(o => !o)} className="flex w-full items-center justify-between gap-4 text-left">
        <span className="text-sm font-semibold">Detalle por pipeline</span>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform shrink-0", open && "rotate-180")} />
      </button>

      {report.pipelines.length > 0 && (
        <div className="mt-4 flex items-center gap-0.5 bg-secondary rounded-md p-0.5 w-fit flex-wrap">
          {report.pipelines.map(p => (
            <button
              key={p.pipeline_id}
              onClick={() => setSelected(p.pipeline_id)}
              className={cn(
                "px-2.5 py-1 rounded text-xs font-medium transition-colors",
                selected === p.pipeline_id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {p.pipeline_name ?? `Embudo ${p.pipeline_id}`}
            </button>
          ))}
        </div>
      )}

      {open && (
        <div className="mt-4">
          {selected === null ? (
            <div className="py-10 text-center text-xs text-muted-foreground">Sin pipelines sincronizados para este tenant todavía.</div>
          ) : (
            <PipelineRichView apiSlug={tenant?.apiSlug} pipelineId={selected} hours={hours} noun={noun} />
          )}
        </div>
      )}
    </div>
  );
}
