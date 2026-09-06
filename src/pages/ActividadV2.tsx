import { useAuth } from "@/context/AuthContext";
import { SectionHeader } from "@/components/SectionHeader";
import { PatientJourneyFunnel } from "@/components/PatientJourneyFunnel";
import { OutcomeBreakdown } from "@/components/OutcomeBreakdown";
import { AttentionNeededCard } from "@/components/AttentionNeededCard";
import { PipelineDetailPanel } from "@/components/PipelineDetailPanel";
import { RecommendationsCard } from "@/components/RecommendationsCard";
import { useActivityOverview } from "@/hooks/useActivityOverview";
import { useLeadStatusReport } from "@/hooks/useLeadStatusReport";
import { useMenuReport } from "@/hooks/useMenuReport";
import { ChartSkeleton } from "@/components/Skeleton";
import { cn } from "@/lib/utils";
import { getBrandName } from "@/lib/whitelabel";
import { useState } from "react";

const TIME_RANGES = [
  { label: "1h",  hours: 1   }, { label: "6h",  hours: 6   },
  { label: "24h", hours: 24  }, { label: "7d",  hours: 168 },
  { label: "30d", hours: 720 },
];

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

/** % defensivo para pasos que SÍ viven en el mismo sistema (lead_tracking)
 * pero igual podrían inflarse por reingresos — se oculta si da algo
 * absurdo en vez de mostrar un número roto. */
function safePct(from: number, to: number): string | null {
  if (from <= 0) return null;
  const ratio = (to / from) * 100;
  if (ratio > 100) return null;
  return `${(Math.round(ratio * 10) / 10).toLocaleString("es-AR")}%`;
}

export default function ActividadV2() {
  const { tenant } = useAuth();
  const [hours, setHours] = useState(168);

  const overview = useActivityOverview(tenant?.apiSlug, hours);
  const report = useLeadStatusReport(tenant?.apiSlug, hours);
  const menuReport = useMenuReport(tenant?.apiSlug, hours);

  if (!tenant) return null;

  const noun = personNoun(tenant.vertical);
  // "El bot respondió..." → "{marca} respondió...": la marca depende del
  // dominio desde el que se accede (ver src/lib/whitelabel.ts), no siempre
  // es "UMEIA" (ej. metodoclinico.com se muestra como "Metodo Clinico").
  const brandName = getBrandName();

  // "conversaciones" no tiene una fuente CRM confiable en general:
  // `chat_messages` solo tiene `conversation_id` y `lead_tracking` solo
  // tiene `lead_id`, no hay columna que las una. PERO cuando el tenant
  // configura explícitamente su "estado base" (`funnel_base_status_ids` —
  // ej. Electro Rai: "Consultando", donde cae toda conversación que el bot
  // atiende), ese conteo SÍ vive en el mismo sistema que el resto del
  // embudo y podemos usarlo en vez de la cuenta de chat. Sin esa config,
  // caemos al conteo de conversaciones del chat (aproximado, sin % contra
  // los pasos siguientes).
  const pipelinesWithBase = report.funnelStages.filter(f => f.first_period_total !== null);
  const conversationsAreCrmBased = pipelinesWithBase.length > 0;

  const conversations = conversationsAreCrmBased
    ? pipelinesWithBase.reduce((sum, f) => sum + (f.first_period_total ?? 0), 0)
    : overview.conversationCounts.bot_reply;

  // "leads avanzaron": cuando hay base configurada, usamos
  // `advanced_period_total` (leads que YA NO están en la columna base) en
  // vez de `leads_active` (cualquier lead tocado, incluye reingresos a la
  // propia base) — comparar "conversaciones" contra leads_active daba
  // porcentajes como "145% avanzó" porque leads_active suma actividad que
  // nunca salió de "Consultando".
  const moved = conversationsAreCrmBased
    ? pipelinesWithBase.reduce((sum, f) => sum + (f.advanced_period_total ?? 0), 0)
    : report.pipelinesPeriodStats.reduce((sum, p) => sum + p.leads_active, 0);

  // "llegaron a X" — el estado que el tenant configuró como resultado
  // (`funnel_outcome_status_ids`), mostrando el que más gente recibió como
  // ejemplo. Su % se calcula acá contra `moved` (no contra el total de
  // OutcomeBreakdown) a propósito: dentro de ESTE widget cada flecha
  // siempre quiere decir "% del paso anterior que llegó al siguiente", así
  // los tres pasos son comparables entre sí. OutcomeBreakdown responde una
  // pregunta distinta ("de todo lo que tocamos, qué % fue esto") y por eso
  // puede mostrar, a propósito, un número distinto para el mismo estado.
  const topFinalStage = report.funnelStages.reduce<typeof report.funnelStages[number] | null>(
    (best, f) => (!best || f.final_period_total > best.final_period_total ? f : best),
    null
  );
  const finalLabel = topFinalStage?.final_status_name ?? null;
  const reached = finalLabel ? topFinalStage?.final_period_total ?? 0 : null;
  const reachedPct = reached !== null ? safePct(moved, reached) : null;

  // Ramas del funnel: ambas de la MISMA fuente que "conversaciones"/"leads
  // avanzaron" (lead_tracking), a diferencia del bug anterior que mezclaba
  // un log de otro sistema (bot menu) como si fuera parte de la misma
  // torta y hacía que dos % sumaran más de 100%.
  const stillInProgress = conversationsAreCrmBased ? Math.max(conversations - moved, 0) : 0;
  const handoffCount = report.hasHandoff ? report.handoffPeriodTotal : 0;
  const funnelBranches = [
    ...(stillInProgress > 0
      ? [{
          value: stillInProgress,
          label: "siguen en curso",
          percent: safePct(conversations, stillInProgress),
          percentBasis: "de tus conversaciones",
        }]
      : []),
    ...(handoffCount > 0
      ? [{
          value: handoffCount,
          label: "derivadas a un humano",
          percent: safePct(moved, handoffCount),
          percentBasis: "de los que avanzaron",
        }]
      : []),
  ];

  // Nota aparte (no rama): una FAQ (envíos, pagos, garantía, horarios)
  // resuelta por el menú guiado del bot es una consulta cerrada, pero viene
  // de `chat_messages`/menú, sin `lead_id` — no hay forma de confirmar que
  // sea un subconjunto de "conversaciones", por eso no se dibuja como parte
  // del mismo embudo (ver docstring de PatientJourneyFunnel).
  const informationalCount = menuReport.connected ? menuReport.informational ?? 0 : 0;
  const funnelNote = informationalCount > 0
    ? {
        value: informationalCount,
        label: "consultas resueltas por FAQ",
        percent: safePct(conversations, informationalCount),
        hint: "otro canal, aparte de este embudo",
      }
    : null;

  const deltaPct = overview.total != null && overview.previousTotal
    ? Math.round(((overview.total - overview.previousTotal) / overview.previousTotal) * 1000) / 10
    : null;

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
                {brandName} respondió <span className="font-bold text-accent">{conversations.toLocaleString("es-AR")}</span> consultas
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

        {overview.loading || report.loading ? (
          <div className="premium-card p-5 lg:col-span-3">
            <ChartSkeleton height={200} />
          </div>
        ) : (
          <RecommendationsCard report={report} overview={overview} deltaPct={deltaPct} noun={noun} brandName={brandName} />
        )}
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
          transitions={
            finalLabel && reached !== null
              ? [
                  { verb: "avanzó", percent: conversationsAreCrmBased ? safePct(conversations, moved) : null },
                  { verb: `llega a ${finalLabel}`, percent: reachedPct },
                ]
              : [{ verb: "avanzó", percent: conversationsAreCrmBased ? safePct(conversations, moved) : null }]
          }
          branches={funnelBranches}
          note={funnelNote}
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
