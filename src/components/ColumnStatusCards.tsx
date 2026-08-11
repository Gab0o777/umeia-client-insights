/**
 * ColumnStatusCards — sección "Actividad del CRM": una status card por
 * columna del pipeline (leads abiertos parados ahí), una card de leads
 * ganados en el período, y — si el tenant tiene configurado el hand-off a
 * un humano — una card con los mensajes que todavía no fueron respondidos
 * en esa columna.
 */
import { useEffect, useMemo, useState } from "react";
import { Layers, Trophy, UserCheck } from "lucide-react";
import { KpiCard } from "@/components/KpiCard";
import { KpiSkeleton } from "@/components/Skeleton";
import { useLeadStatusReport } from "@/hooks/useLeadStatusReport";

const ACCENTS = ["primary", "info", "accent", "success", "warning"] as const;

const ALL_PIPELINES = "all" as const;

export function ColumnStatusCards({ apiSlug, hours }: { apiSlug: string | undefined; hours?: number }) {
  const report = useLeadStatusReport(apiSlug, hours);
  const [selectedPipeline, setSelectedPipeline] = useState<number | typeof ALL_PIPELINES>(ALL_PIPELINES);

  // Si cambia el tenant, no dejar seleccionado un pipeline que puede no existir para el nuevo.
  useEffect(() => { setSelectedPipeline(ALL_PIPELINES); }, [apiSlug]);

  // pipelines conocidos por el backend + cualquier pipeline_id "huérfano" que
  // aparezca en columns pero todavía no tenga fila en pipeline_status (sync
  // de nombres no corrió aún para ese embudo).
  const pipelineTabs = useMemo(() => {
    const known = new Map<number, string | null>(
      report.pipelines.map(p => [p.pipeline_id, p.pipeline_name])
    );
    for (const col of report.columns) {
      if (!known.has(col.pipeline_id)) known.set(col.pipeline_id, null);
    }
    return Array.from(known, ([pipeline_id, pipeline_name]) => ({ pipeline_id, pipeline_name }));
  }, [report.pipelines, report.columns]);

  const visibleColumns = selectedPipeline === ALL_PIPELINES
    ? report.columns
    : report.columns.filter(c => c.pipeline_id === selectedPipeline);

  const title = report.crm
    ? `Actividad del CRM — ${report.crm.name} (${report.crm.subdomain})`
    : "Actividad del CRM";

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</h3>

      {pipelineTabs.length > 1 && (
        <div className="flex items-center gap-0.5 bg-secondary rounded-md p-0.5 w-fit">
          <button
            onClick={() => setSelectedPipeline(ALL_PIPELINES)}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              selectedPipeline === ALL_PIPELINES
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Todos
          </button>
          {pipelineTabs.map(p => (
            <button
              key={p.pipeline_id}
              onClick={() => setSelectedPipeline(p.pipeline_id)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                selectedPipeline === p.pipeline_id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.pipeline_name ?? `Embudo ${p.pipeline_id}`}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {report.loading
          ? Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
          : visibleColumns.map((col, i) => (
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

        {!report.loading && visibleColumns.length === 0 && (
          <div className="premium-card p-5 text-xs text-muted-foreground sm:col-span-2 lg:col-span-3">
            Sin columnas con leads abiertos en este momento.
          </div>
        )}
      </div>
    </div>
  );
}
