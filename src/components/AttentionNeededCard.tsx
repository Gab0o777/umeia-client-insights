/**
 * AttentionNeededCard — "Necesita tu atención": alerta de leads en la
 * columna de handoff todavía esperando respuesta humana, más (si el tenant
 * tiene un estado cuyo nombre matchea "reprogramar"/"cancelar") cuántos
 * pacientes pidieron reprogramar o cancelar en el período. Genérico: ambas
 * alertas desaparecen solas si el tenant no aplica (sin handoff configurado,
 * o sin ese tipo de estado en su pipeline). Parte de Actividad v2.
 */
import { useNavigate } from "react-router-dom";
import { AlertTriangle, CalendarClock } from "lucide-react";
import { LeadStatusReport } from "@/hooks/useLeadStatusReport";

const CANCEL_OR_RESCHEDULE = /reprogramar|cancelar|cancelaci/i;

export function AttentionNeededCard({ report }: { report: LeadStatusReport }) {
  const navigate = useNavigate();

  const cancelCount = report.columns
    .filter(c => c.status_name && CANCEL_OR_RESCHEDULE.test(c.status_name))
    .reduce((sum, c) => sum + c.period_total, 0);

  const showPendingAlert = report.hasHandoff;
  const showCancelAlert = cancelCount > 0;

  return (
    <div className="premium-card p-5 space-y-3">
      <div className="text-sm font-semibold">Necesita tu atención</div>

      {!showPendingAlert && !showCancelAlert && (
        <div className="py-6 text-center text-xs text-muted-foreground">Sin alertas en este período</div>
      )}

      {showPendingAlert && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-warning/30 bg-warning/10 p-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-warning">
              {(report.pendingReply ?? 0).toLocaleString("es-AR")} conversaciones esperando respuesta humana
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Derivadas a atención humana, sin seguimiento del equipo todavía.
            </p>
          </div>
          <button
            onClick={() => navigate("/conversaciones")}
            className="shrink-0 rounded-lg bg-warning/20 px-3 py-1.5 text-xs font-semibold text-warning hover:bg-warning/30 transition-colors"
          >
            Ver conversaciones
          </button>
        </div>
      )}

      {showCancelAlert && (
        <div className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5">
          <CalendarClock className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="text-sm">
            <span className="font-semibold">{cancelCount.toLocaleString("es-AR")}</span> pacientes solicitaron reprogramar o cancelar
          </span>
        </div>
      )}
    </div>
  );
}
