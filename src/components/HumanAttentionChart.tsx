/**
 * HumanAttentionChart — sección "Atención humana": cuántas conversaciones
 * paradas en la(s) columna(s) de handoff ya fueron respondidas vs. cuántas
 * siguen sin respuesta. Solo se renderiza si el tenant tiene handoff
 * configurado (report.hasHandoff).
 */
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { LeadStatusReport } from "@/hooks/useLeadStatusReport";
import { ChartSkeleton } from "@/components/Skeleton";

const TOOLTIP_STYLE = {
  background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))",
  borderRadius: 8, fontSize: 12,
};

export function HumanAttentionChart({ report }: { report: LeadStatusReport }) {
  if (report.loading) {
    return (
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Atención humana</h3>
        <ChartSkeleton height={140} />
      </div>
    );
  }

  if (!report.hasHandoff) return null;

  const total = report.columns
    .filter(c => report.handoffStatusIds.includes(c.status_id))
    .reduce((sum, c) => sum + c.total, 0);
  const pending = report.pendingReply ?? 0;
  const responded = Math.max(0, total - pending);
  const pendingPct = total > 0 ? Math.round((pending / total) * 100) : 0;

  const data = [{ name: "Atención humana", responded, pending }];

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Atención humana</h3>
      <div className="premium-card p-5">
        <div className="flex items-baseline justify-between gap-3 mb-4">
          <div>
            <div className="text-sm font-semibold">Conversaciones en columna de handoff</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {total} conversaciones · {pending} sin responder ({pendingPct}%)
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs shrink-0">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: "hsl(var(--success))" }} />
              Respondidas
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: "hsl(var(--warning))" }} />
              Sin responder
            </span>
          </div>
        </div>

        {total === 0 ? (
          <div className="h-[80px] flex items-center justify-center">
            <p className="text-xs text-muted-foreground">Sin conversaciones en la columna de atención humana.</p>
          </div>
        ) : (
          <div className="h-[80px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
                barCategoryGap="40%"
              >
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" hide />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "hsl(var(--secondary))" }} />
                <Bar dataKey="responded" name="Respondidas" stackId="a" fill="hsl(var(--success))" radius={[4, 0, 0, 4]} />
                <Bar dataKey="pending" name="Sin responder" stackId="a" fill="hsl(var(--warning))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
