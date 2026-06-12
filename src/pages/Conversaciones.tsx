import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { SectionHeader } from "@/components/SectionHeader";
import { KpiCard } from "@/components/KpiCard";
import { MessageSquare, Sparkles, Repeat } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, PieChart, Pie, LineChart, Line } from "recharts";
import { useRealMetrics } from "@/hooks/useRealMetrics";
import { ChatExplorer } from "@/components/ChatExplorer";

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--info))", "hsl(var(--success))", "hsl(var(--warning))"];

const TIME_RANGES = [
  { label: "1h",  hours: 1 },
  { label: "6h",  hours: 6 },
  { label: "24h", hours: 24 },
  { label: "7d",  hours: 168 },
  { label: "30d", hours: 720 },
];

export default function Conversaciones() {
  const { tenant } = useAuth();
  const [hours, setHours] = useState(24);
  const real = useRealMetrics(tenant?.apiSlug, hours);

  if (!tenant) return null;

  const newConvos = Math.round(tenant.kpis.activeConvos * 0.62);
  const recurring = tenant.kpis.activeConvos - newConvos;

  const byChannel = real.byChannel.length > 0 ? real.byChannel : tenant.byChannel;
  const byHour    = real.byHour.length    > 0 ? real.byHour    : tenant.byHour;
  const byIntent  = real.byIntent.length  > 0 ? real.byIntent  : tenant.byIntent.map(b => ({ intent: b.intent, value: b.value }));

  return (
    <div className="space-y-6">
      <SectionHeader title="Conversaciones" description={`Top consultas de ${tenant.name} — ${tenant.verticalLabel}.`} />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Total conversaciones" value={tenant.kpis.messages} icon={MessageSquare} accent="primary" />
        <KpiCard label="Nuevas" value={newConvos} icon={Sparkles} accent="info" subtitle={`${Math.round((newConvos/tenant.kpis.activeConvos)*100)}% del total activo`} />
        <KpiCard label="Recurrentes" value={recurring} icon={Repeat} accent="accent" />
      </div>

      <div className="premium-card p-5">
        <h3 className="text-sm font-semibold mb-4">Top consultas</h3>
        <div className="space-y-3">
          {tenant.topQueries.map((q, i) => {
            const max = Math.max(...tenant.topQueries.map((x) => x.count));
            const pct = (q.count / max) * 100;
            return (
              <div key={q.label}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium">{q.label}</span>
                  <span className="text-muted-foreground font-mono text-xs">{q.count.toLocaleString("es-AR")}</span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full bg-gradient-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Gráficas con selector de rango compartido */}
      <div className="premium-card p-5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-semibold">Distribución de conversaciones</h3>
          <div className="flex items-center gap-0.5 bg-secondary rounded-md p-0.5">
            {TIME_RANGES.map(r => (
              <button
                key={r.label}
                onClick={() => setHours(r.hours)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  hours === r.hours
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted-foreground font-medium">Por canal</p>
              {real.byChannel.length > 0 && <span className="text-[10px] text-emerald-400">● live</span>}
            </div>
            <div className="h-[220px]">
              {real.loading
                ? <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Cargando…</div>
                : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={byChannel} dataKey="value" nameKey="name" outerRadius={80} label={(e) => e.name}>
                        {byChannel.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted-foreground font-medium">Por horario</p>
              {real.byHour.length > 0 && <span className="text-[10px] text-emerald-400">● live</span>}
            </div>
            <div className="h-[220px]">
              {real.loading
                ? <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Cargando…</div>
                : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={byHour} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                      <Line type="monotone" dataKey="value" stroke="hsl(var(--accent))" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted-foreground font-medium">Por intención</p>
              {real.byIntent.length > 0 && <span className="text-[10px] text-emerald-400">● live</span>}
            </div>
            <div className="h-[220px]">
              {real.loading
                ? <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Cargando…</div>
                : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={byIntent} layout="vertical" margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <YAxis dataKey="intent" type="category" stroke="hsl(var(--muted-foreground))" fontSize={10} width={110} />
                      <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                        {byIntent.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
            </div>
          </div>
        </div>
      </div>

      <ChatExplorer apiSlug={tenant.apiSlug} />
    </div>
  );
}
