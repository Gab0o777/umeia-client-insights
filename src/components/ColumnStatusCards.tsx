/**
 * ColumnStatusCards — grilla de status cards que reemplaza al viejo listado
 * de "Actividad reciente": una card por columna del pipeline del CRM (leads
 * abiertos parados ahí) más una card con los mensajes respondidos
 * manualmente por un agente.
 */
import { Layers, Headset } from "lucide-react";
import { KpiCard } from "@/components/KpiCard";
import { KpiSkeleton } from "@/components/Skeleton";
import { useLeadStatusReport } from "@/hooks/useLeadStatusReport";
import type { ActivitySummary } from "@/hooks/useActivitySummary";

const ACCENTS = ["primary", "info", "accent", "success", "warning"] as const;

export function ColumnStatusCards({ apiSlug, summary }: {
  apiSlug: string | undefined;
  summary: ActivitySummary;
}) {
  const report = useLeadStatusReport(apiSlug);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {summary.loading
        ? <KpiSkeleton />
        : (
          <KpiCard
            label="Respondidos manualmente"
            value={summary.humanAgentReply}
            icon={Headset}
            accent="warning"
            subtitle="Mensajes contestados por un agente del CRM"
          />
        )
      }

      {report.loading
        ? Array.from({ length: 3 }).map((_, i) => <KpiSkeleton key={i} />)
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

      {!report.loading && report.columns.length === 0 && (
        <div className="premium-card p-5 text-xs text-muted-foreground sm:col-span-2 lg:col-span-3">
          Sin columnas con leads abiertos en este momento.
        </div>
      )}
    </div>
  );
}
