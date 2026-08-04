/**
 * HumanAttentionChart — sección "Atención humana": dos gráficos lado a lado.
 * Izquierda: proporción de conversaciones respondidas vs. sin responder en
 * la(s) columna(s) de handoff (pie/donut). Derecha: antigüedad de esas
 * conversaciones — cuántos días llevan esperando — para ver si el backlog
 * se está acumulando. Solo se renderiza si el tenant tiene handoff
 * configurado (report.hasHandoff).
 */
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { LeadStatusReport } from "@/hooks/useLeadStatusReport";
import { ChartSkeleton } from "@/components/Skeleton";

const TOOLTIP_STYLE = {
  background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))",
  borderRadius: 8, fontSize: 12,
};

const RESPONDED_COLOR = "hsl(var(--success))";
const PENDING_COLOR = "hsl(var(--warning))";
const AGE_COLOR = "hsl(var(--accent))";

export function HumanAttentionChart({ report }: { report: LeadStatusReport }) {
  if (report.loading) {
    return (
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Atención humana</h3>
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartSkeleton height={220} />
          <ChartSkeleton height={220} />
        </div>
      </div>
    );
  }

  if (!report.hasHandoff) return null;

  const handoffColumns = report.columns.filter(c => report.handoffStatusIds.includes(c.status_id));
  const total = handoffColumns.reduce((sum, c) => sum + c.total, 0);
  const pending = report.pendingReply ?? 0;
  const responded = Math.max(0, total - pending);
  const pendingPct = total > 0 ? Math.round((pending / total) * 100) : 0;

  const pieData = [
    { name: "Respondidas", value: responded, color: RESPONDED_COLOR },
    { name: "Sin responder", value: pending, color: PENDING_COLOR },
  ];

  const ageData = report.rangeLabels.map(label => ({
    label,
    count: handoffColumns.reduce((sum, c) => sum + (c.ranges[label] ?? 0), 0),
  }));

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Atención humana</h3>
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Proporción respondidas / sin responder */}
        <div className="premium-card p-5">
          <div className="mb-4">
            <div className="text-sm font-semibold">Conversaciones en columna de handoff</div>
            <div className="text-xs text-muted-foreground mt-0.5">{total} conversaciones en total</div>
          </div>

          {total === 0 ? (
            <div className="h-[180px] flex items-center justify-center">
              <p className="text-xs text-muted-foreground">Sin conversaciones en la columna de atención humana.</p>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="relative h-[180px] w-[180px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={pending > 0 && responded > 0 ? 3 : 0}
                      stroke="hsl(var(--card))"
                      strokeWidth={2}
                    >
                      {pieData.map(entry => <Cell key={entry.name} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => v.toLocaleString("es-AR")} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-bold tracking-tight">{pendingPct}%</span>
                  <span className="text-[10px] text-muted-foreground">sin responder</span>
                </div>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: RESPONDED_COLOR }} />
                  <span className="text-muted-foreground">Respondidas</span>
                  <span className="font-semibold ml-auto">{responded.toLocaleString("es-AR")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: PENDING_COLOR }} />
                  <span className="text-muted-foreground">Sin responder</span>
                  <span className="font-semibold ml-auto">{pending.toLocaleString("es-AR")}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Antigüedad del backlog */}
        <div className="premium-card p-5">
          <div className="mb-4">
            <div className="text-sm font-semibold">Antigüedad en la columna</div>
            <div className="text-xs text-muted-foreground mt-0.5">Días que llevan las conversaciones esperando</div>
          </div>
          {total === 0 ? (
            <div className="h-[180px] flex items-center justify-center">
              <p className="text-xs text-muted-foreground">Sin conversaciones en la columna de atención humana.</p>
            </div>
          ) : (
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [v.toLocaleString("es-AR"), "Conversaciones"]} />
                  <Bar dataKey="count" name="Conversaciones" fill={AGE_COLOR} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
