/**
 * ColumnStatusCards — sección "Actividad del CRM": una status card por
 * columna del pipeline (leads abiertos parados ahí), una card de leads
 * ganados en el período, y — si el tenant tiene configurado el hand-off a
 * un humano — una card con los mensajes que todavía no fueron respondidos
 * en esa columna.
 */
import { Layers, Trophy, UserCheck } from "lucide-react";
import { KpiCard } from "@/components/KpiCard";
import { KpiSkeleton } from "@/components/Skeleton";
import { useLeadStatusReport } from "@/hooks/useLeadStatusReport";

const ACCENTS = ["primary", "info", "accent", "success", "warning"] as const;

export function ColumnStatusCards({ apiSlug, hours }: { apiSlug: string | undefined; hours?: number }) {
  const report = useLeadStatusReport(apiSlug, hours);

  const title = report.crm
    ? `Actividad del CRM — ${report.crm.name} (${report.crm.subdomain})`
    : "Actividad del CRM";

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</h3>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {report.loading
          ? Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
          : report.columns.map((col, i) => (
              <KpiCard
                key={col.status_id}
                label={col.status_name ?? `Columna ${col.status_id}`}
                value={col.total}
                icon={Layers}
                accent={ACCENTS[i % ACCENTS.length]}
                subtitle="Leads en esta columna"
              />
            ))
        }

        {report.loading
          ? <KpiSkeleton />
          : (
            <KpiCard
              label="Leads ganados"
              value={report.leadsWon}
              icon={Trophy}
              accent="success"
              subtitle="Ganados en el período seleccionado"
            />
          )
        }

        {!report.loading && report.hasHandoff && (
          <KpiCard
            label="Sin responder (respuesta humana)"
            value={report.pendingReply}
            icon={UserCheck}
            accent="warning"
            subtitle="Leads en la columna de handoff cuyo último mensaje quedó sin contestar"
          />
        )}

        {!report.loading && report.columns.length === 0 && (
          <div className="premium-card p-5 text-xs text-muted-foreground sm:col-span-2 lg:col-span-3">
            Sin columnas con leads abiertos en este momento.
          </div>
        )}
      </div>
    </div>
  );
}
