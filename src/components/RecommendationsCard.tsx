/**
 * RecommendationsCard — "{marca} te recomienda": 1 a 3 sugerencias cortas
 * calculadas en el cliente a partir de datos que ya se muestran en el resto
 * de la página (nada nuevo del backend). Reglas simples y conservadoras a
 * propósito — mejor decir menos que inventar un consejo sin sustento en los
 * datos reales del tenant.
 */
import { AlertTriangle, CalendarClock, Headset, LucideIcon, Sparkles, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { LeadStatusReport } from "@/hooks/useLeadStatusReport";
import { ActivityOverview } from "@/hooks/useActivityOverview";

interface Recommendation {
  icon: LucideIcon;
  accent: "warning" | "info" | "success";
  text: string;
}

const ACCENT_BG: Record<Recommendation["accent"], string> = {
  warning: "bg-warning/10 text-warning",
  info: "bg-info/10 text-info",
  success: "bg-success/10 text-success",
};

const CANCEL_OR_RESCHEDULE = /reprogramar|cancelar|cancelaci/i;

function buildRecommendations(
  report: LeadStatusReport, overview: ActivityOverview, deltaPct: number | null, noun: string
): Recommendation[] {
  const recs: Recommendation[] = [];

  if (deltaPct !== null && deltaPct <= -20) {
    recs.push({
      icon: TrendingDown, accent: "warning",
      text: `La actividad bajó ${Math.abs(deltaPct)}% respecto al período anterior — vale la pena revisar si cambió algo (campañas, disponibilidad, horarios de atención).`,
    });
  }

  if (report.hasHandoff && (report.pendingReply ?? 0) > 0) {
    recs.push({
      icon: AlertTriangle, accent: "warning",
      text: `${report.pendingReply.toLocaleString("es-AR")} conversaciones derivadas a un humano siguen sin respuesta — priorizarlas evita perder ${noun}.`,
    });
  }

  const totalReplies = overview.counts.bot_reply + overview.counts.human_agent_reply;
  if (totalReplies > 0) {
    const humanShare = (overview.counts.human_agent_reply / totalReplies) * 100;
    if (humanShare >= 40) {
      recs.push({
        icon: Headset, accent: "info",
        text: `Un ${Math.round(humanShare)}% de las respuestas las dio un agente humano, no el bot — podría valer la pena ampliar qué consultas puede resolver automáticamente.`,
      });
    }
  }

  const cancelCount = report.columns
    .filter(c => c.status_name && CANCEL_OR_RESCHEDULE.test(c.status_name))
    .reduce((sum, c) => sum + c.period_total, 0);
  if (cancelCount > 0) {
    recs.push({
      icon: CalendarClock, accent: "info",
      text: `${cancelCount.toLocaleString("es-AR")} ${noun} pidieron reprogramar o cancelar este período — revisar los motivos puede ayudarte a reducirlo.`,
    });
  }

  if (recs.length === 0) {
    recs.push({
      icon: Sparkles, accent: "success",
      text: "No detectamos alertas en este período — la operación se ve saludable.",
    });
  }

  return recs.slice(0, 3);
}

export function RecommendationsCard({
  report, overview, deltaPct, noun, brandName,
}: {
  report: LeadStatusReport;
  overview: ActivityOverview;
  deltaPct: number | null;
  noun: string;
  brandName: string;
}) {
  const recommendations = buildRecommendations(report, overview, deltaPct, noun);

  return (
    <div className="premium-card p-5 lg:col-span-3">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-4 w-4 text-accent" />
        <div className="text-sm font-semibold">{brandName} te recomienda</div>
      </div>
      <div className="space-y-3">
        {recommendations.map((rec, i) => (
          <div key={i} className="flex items-start gap-3 rounded-xl border border-border px-4 py-3">
            <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", ACCENT_BG[rec.accent])}>
              <rec.icon className="h-4 w-4" />
            </div>
            <p className="text-sm leading-snug">{rec.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
