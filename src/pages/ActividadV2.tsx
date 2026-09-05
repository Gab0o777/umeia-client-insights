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

// Cómo llamar a "la gente que le escribe al bot" según el rubro del tenant —
// no es lo mismo un paciente (clínica) que un cliente (ecommerce) o un
// alumno (educación). Default genérico para verticales no mapeados.
const PERSON_NOUN: Record<string, string> = {
  clinica: "pacientes",
  ecommerce: "clientes",
  educacion: "alumnos",
};
function personNoun(vertical: string): string {
  return PERSON_NOUN[vertical] ?? "clientes";
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

  const noun = personNoun(tenant.vertical);

  // Los 3 números del "recorrido" salen de sistemas distintos y NO hay forma
  // de unirlos hoy: `chat_messages` (conversaciones) solo tiene
  // `conversation_id`, `lead_tracking` (leads/embudo) solo tiene `lead_id` —
  // no existe una columna que los relacione. Ya probamos forzar
  // "conversaciones" a salir del lado del CRM (`first_period_total`, leads
  // que se MUEVEN hacia la primera columna) y el resultado fue peor: un lead
  // nuevo no "se mueve" a su primera columna, nace ahí directamente, así que
  // ese conteo daba ~0 aunque hubiera actividad real.
  //
  // Por eso cada número se muestra con la fuente que SÍ puede medir lo que
  // dice, y no mostramos ningún % entre "conversaciones" y "leads
  // avanzaron" — sería comparar peras con manzanas sin importar la fórmula.
  // "leads avanzaron" → "llegaron a X" sí es 100% CRM (mismo lead_id), pero
  // igual no le ponemos %: ese mismo dato ya tiene un % confiable y sin
  // ambigüedad en "¿En qué terminaron las consultas?" (OutcomeBreakdown),
  // calculado sobre el mismo total para todas las columnas — mostrar OTRO %
  // acá, con otra base, para el mismo número (251 en ambos lados) es lo que
  // se veía como "cosas raras" (5,6% acá vs. 4,1% ahí).
  const conversations = overview.conversationCounts.bot_reply;
  const moved = report.pipelinesPeriodStats.reduce((sum, p) => sum + p.leads_active, 0);

  const topFinalStage = report.funnelStages.reduce<typeof report.funnelStages[number] | null>(
    (best, f) => (!best || f.final_period_total > best.final_period_total ? f : best),
    null
  );
  const finalLabel = topFinalStage?.final_status_name ?? null;
  const reached = finalLabel ? topFinalStage?.final_period_total ?? 0 : null;

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
            <div className="space-y-4">
              <p className="text-2xl leading-snug font-semibold">
                El bot respondió <span className="font-bold text-accent">{conversations.toLocaleString("es-AR")}</span> consultas
                y ayudó a mover <span className="font-bold text-info">{moved.toLocaleString("es-AR")}</span> {noun}.
                {finalLabel && reached !== null && (
                  <> <span className="font-bold text-success">{reached.toLocaleString("es-AR")}</span> llegaron a {finalLabel}.</>
                )}
              </p>
              {deltaPct !== null && (
                <div className={cn("inline-flex items-center gap-1.5 text-sm font-semibold", deltaPct >= 0 ? "text-success" : "text-destructive")}>
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
          title={`El recorrido de tus ${noun}`}
          steps={[
            { label: "conversaciones", value: conversations, accent: "accent" },
            { label: "leads avanzaron", value: moved, accent: "info" },
            ...(finalLabel && reached !== null
              ? [{ label: `llegaron a ${finalLabel}`, value: reached, accent: "success" as const }]
              : []),
          ]}
          transitions={finalLabel && reached !== null ? ["avanzó", `llega a ${finalLabel}`] : ["avanzó"]}
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
