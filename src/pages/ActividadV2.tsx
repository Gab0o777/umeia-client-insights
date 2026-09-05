import { useAuth } from "@/context/AuthContext";
import { SectionHeader } from "@/components/SectionHeader";
import { PatientJourneyFunnel } from "@/components/PatientJourneyFunnel";
import { OutcomeBreakdown } from "@/components/OutcomeBreakdown";
import { AttentionNeededCard } from "@/components/AttentionNeededCard";
import { PipelineDetailPanel } from "@/components/PipelineDetailPanel";
import { useActivityOverview } from "@/hooks/useActivityOverview";
import { useLeadStatusReport } from "@/hooks/useLeadStatusReport";
import { useRealMetrics } from "@/hooks/useRealMetrics";
import { ChartSkeleton } from "@/components/Skeleton";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { useState } from "react";

const TIME_RANGES = [
  { label: "1h",  hours: 1   }, { label: "6h",  hours: 6   },
  { label: "24h", hours: 24  }, { label: "7d",  hours: 168 },
  { label: "30d", hours: 720 },
];

function daysFor(hours: number): number {
  if (hours <= 24) return 1;
  if (hours <= 168) return 7;
  return 30;
}

const TOOLTIP_STYLE = {
  background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))",
  borderRadius: 8, fontSize: 12,
};

export default function ActividadV2() {
  const { tenant } = useAuth();
  const [hours, setHours] = useState(168);

  const overview = useActivityOverview(tenant?.apiSlug, hours);
  const report = useLeadStatusReport(tenant?.apiSlug, hours);
  const real = useRealMetrics(tenant?.apiSlug, hours, daysFor(hours));

  if (!tenant) return null;

  const conversations = overview.conversationCounts.bot_reply;

  // "Leads avanzaron" = leads DISTINTOS que cambiaron de estado en el
  // período (`pipelinesPeriodStats`, misma tabla que las conversaciones:
  // 1 lead = 1 fila). NO usamos `overview.counts.lead_moved_column`: ese es
  // un conteo de EVENTOS de movimiento (un mismo lead puede moverse varias
  // veces), no de leads — comparado contra "conversaciones" (distintas)
  // podía dar porcentajes sin sentido como "296% avanzó".
  const moved = report.pipelinesPeriodStats.reduce((sum, p) => sum + p.leads_active, 0);

  // "Llegaron a X" = la última columna operativa (por orden real del embudo
  // en el CRM, ver `funnelStages` / backend `_funnel_stage_candidates`) que
  // más leads recibió en el período — se muestra como ejemplo representativo
  // en vez de sumar todos los pipelines, así el nombre siempre es concreto
  // ("Turno asignado") y no un genérico "estado final" cuando hay más de un
  // pipeline con nombres de cierre distintos. NO usamos `leadsWon`: marcar
  // "Ganado" es una acción manual aparte que muchos leads que sí llegaron a
  // destino nunca reciben.
  const topFinalStage = report.funnelStages.reduce<typeof report.funnelStages[number] | null>(
    (best, f) => (!best || f.final_period_total > best.final_period_total ? f : best),
    null
  );
  const reached = topFinalStage?.final_period_total ?? 0;
  const finalLabel = topFinalStage?.final_status_name ?? "un estado final";

  const deltaPct = overview.total != null && overview.previousTotal
    ? Math.round(((overview.total - overview.previousTotal) / overview.previousTotal) * 1000) / 10
    : null;

  const dailyData = real.messagesByDay.map(d => ({ day: d.day, total: d.auto + d.human }));

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Actividad"
        description={`${tenant.name} — últimos ${hours >= 168 ? Math.round(hours / 24) + " días" : hours + "h"}.`}
        actions={
          <div className="flex items-center gap-0.5 bg-secondary rounded-md p-0.5">
            {TIME_RANGES.map(r => (
              <button key={r.label} onClick={() => setHours(r.hours)}
                className={cn(
                  "px-2.5 py-1 rounded text-xs font-medium transition-colors",
                  hours === r.hours ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}>
                {r.label}
              </button>
            ))}
          </div>
        }
      />

      {/* ── Lo que pasó + actividad diaria ── */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="premium-card p-5 lg:col-span-2">
          <div className="text-sm font-semibold mb-4">Lo que pasó esta semana</div>
          {overview.loading ? (
            <ChartSkeleton height={140} />
          ) : (
            <div className="space-y-3">
              <p className="text-sm leading-relaxed">
                El bot respondió <span className="font-bold text-accent">{conversations.toLocaleString("es-AR")}</span> consultas
                y ayudó a mover <span className="font-bold text-info">{moved.toLocaleString("es-AR")}</span> pacientes.{" "}
                <span className="font-bold text-success">{reached.toLocaleString("es-AR")}</span> llegaron a {finalLabel}.
              </p>
              {deltaPct !== null && (
                <div className={cn("inline-flex items-center gap-1 text-xs font-semibold", deltaPct >= 0 ? "text-success" : "text-destructive")}>
                  <span>{deltaPct >= 0 ? "▲" : "▼"}</span>
                  <span>{Math.abs(deltaPct)}% {deltaPct >= 0 ? "más" : "menos"} actividad que el período anterior</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="premium-card p-5 lg:col-span-3">
          <div className="text-sm font-semibold mb-4">Actividad diaria</div>
          {real.messagesByDayLoading ? (
            <ChartSkeleton height={200} />
          ) : dailyData.length > 0 ? (
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Area type="monotone" dataKey="total" name="Actividad" stroke="hsl(var(--accent))" strokeWidth={2} fill="url(#activityFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center">
              <p className="text-xs text-muted-foreground">Sin datos en el período</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Recorrido de pacientes ── */}
      {overview.loading || report.loading ? (
        <ChartSkeleton height={140} />
      ) : (
        <PatientJourneyFunnel
          steps={[
            { label: "conversaciones", value: conversations, accent: "accent" },
            { label: "leads avanzaron", value: moved, accent: "info" },
            { label: `llegaron a ${finalLabel}`, value: reached, accent: "success" },
          ]}
          transitions={["avanzó", `llega a ${finalLabel}`]}
        />
      )}

      {/* ── En qué terminaron + necesita tu atención ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {report.loading ? <ChartSkeleton height={220} /> : <OutcomeBreakdown columns={report.columns} />}
        {report.loading ? <ChartSkeleton height={220} /> : <AttentionNeededCard report={report} />}
      </div>

      {/* ── Detalle por pipeline ── */}
      {!report.loading && <PipelineDetailPanel report={report} />}
    </div>
  );
}
