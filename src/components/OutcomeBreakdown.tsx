/**
 * OutcomeBreakdown — "¿En qué terminaron las consultas?": agrupa las
 * columnas del pipeline por nombre (mismo estado puede existir en más de un
 * pipeline, ej. una sede por pipeline) y suma `period_total` — leads que
 * ENTRARON a ese estado en el rango de fecha elegido, no la foto actual.
 * Parte de Actividad v2. Reutilizado también, en modo `bare`, dentro de
 * PipelineDetailPanel para el desglose filtrado por pipeline.
 */
import { useMemo } from "react";
import { LeadStatusColumn } from "@/hooks/useLeadStatusReport";

const BAR_COLORS = [
  "hsl(var(--success))",
  "hsl(var(--info))",
  "hsl(var(--accent))",
  "hsl(var(--warning))",
  "hsl(var(--destructive))",
  "hsl(var(--primary))",
];

function groupByName(columns: LeadStatusColumn[]) {
  const map = new Map<string, number>();
  for (const col of columns) {
    const key = col.status_name ?? `Columna ${col.status_id}`;
    map.set(key, (map.get(key) ?? 0) + col.period_total);
  }
  return Array.from(map, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

function BreakdownBars({ columns }: { columns: LeadStatusColumn[] }) {
  const rows = useMemo(() => groupByName(columns), [columns]);
  const total = rows.reduce((sum, r) => sum + r.value, 0);
  const max = rows[0]?.value ?? 0;

  if (total === 0) {
    return <div className="py-8 text-center text-xs text-muted-foreground">Sin datos en el período seleccionado</div>;
  }

  return (
    <div className="space-y-3">
      {rows.map((row, i) => {
        const share = total > 0 ? (row.value / total) * 100 : 0;
        const barWidth = max > 0 ? (row.value / max) * 100 : 0;
        return (
          <div key={row.name} className="space-y-1">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-foreground truncate">{row.name}</span>
              <span className="font-semibold text-muted-foreground shrink-0">
                {row.value.toLocaleString("es-AR")} · {share.toFixed(1)}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${barWidth}%`, background: BAR_COLORS[i % BAR_COLORS.length] }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function OutcomeBreakdown({ columns, bare = false }: { columns: LeadStatusColumn[]; bare?: boolean }) {
  if (bare) return <BreakdownBars columns={columns} />;

  return (
    <div className="premium-card p-5">
      <div className="text-sm font-semibold mb-4">¿En qué terminaron las consultas?</div>
      <BreakdownBars columns={columns} />
    </div>
  );
}
