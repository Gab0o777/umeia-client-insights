/**
 * PipelineDetailPanel — "Detalle por pipeline": colapsado por defecto,
 * tabs "Todos" + cada pipeline del tenant (mismo patrón que
 * ColumnStatusCards), y al expandir reutiliza OutcomeBreakdown en modo
 * `bare` filtrado al pipeline elegido. Parte de Actividad v2.
 */
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { LeadStatusReport } from "@/hooks/useLeadStatusReport";
import { OutcomeBreakdown } from "@/components/OutcomeBreakdown";

const ALL_PIPELINES = "all" as const;

export function PipelineDetailPanel({ report }: { report: LeadStatusReport }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<number | typeof ALL_PIPELINES>(ALL_PIPELINES);

  const visibleColumns = selected === ALL_PIPELINES
    ? report.columns
    : report.columns.filter(c => c.pipeline_id === selected);

  return (
    <div className="premium-card p-5">
      <button onClick={() => setOpen(o => !o)} className="flex w-full items-center justify-between gap-4 text-left">
        <span className="text-sm font-semibold">Detalle por pipeline</span>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform shrink-0", open && "rotate-180")} />
      </button>

      <div className="mt-4 flex items-center gap-0.5 bg-secondary rounded-md p-0.5 w-fit flex-wrap">
        <button
          onClick={() => setSelected(ALL_PIPELINES)}
          className={cn(
            "px-2.5 py-1 rounded text-xs font-medium transition-colors",
            selected === ALL_PIPELINES ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Todos
        </button>
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

      {open && (
        <div className="mt-4">
          <OutcomeBreakdown columns={visibleColumns} bare />
        </div>
      )}
    </div>
  );
}
