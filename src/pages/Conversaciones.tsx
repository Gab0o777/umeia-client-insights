import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { SectionHeader } from "@/components/SectionHeader";
import { KpiCard } from "@/components/KpiCard";
import { MessageSquare, Sparkles, Repeat, RefreshCw } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, Cell, PieChart, Pie, LineChart, Line,
} from "recharts";
import { useRealMetrics } from "@/hooks/useRealMetrics";
import { ChatExplorer } from "@/components/ChatExplorer";
import { KpiSkeleton, PieSkeleton, ChartSkeleton, EmptyData } from "@/components/Skeleton";

const COLORS = [
  "hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--info))",
  "hsl(var(--success))", "hsl(var(--warning))",
];
const TOOLTIP_STYLE = {
  background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))",
  borderRadius: 8, fontSize: 12,
};
const TIME_RANGES = [
  { label: "1h",  hours: 1   }, { label: "6h",  hours: 6   },
  { label: "24h", hours: 24  }, { label: "7d",  hours: 168 },
  { label: "30d", hours: 720 },
];

export default function Conversaciones() {
  const { tenant } = useAuth();
  const [hours, setHours] = useState(24);
  const real = useRealMetrics(tenant?.apiSlug, hours);

  if (!tenant) return null;

  const isRefreshing = real.loading && !real.messages;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Conversaciones"
        description={`${tenant.name} — ${tenant.verticalLabel}.`}
      />

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        {real.loading ? (
          <><KpiSkeleton /><KpiSkeleton /><KpiSkeleton /></>
        ) : (
          <>
            <KpiCard label="Total mensajes"    value={real.messages}     icon={MessageSquare} accent="primary" />
            <KpiCard label="Conversaciones"    value={real.activeConvos} icon={Sparkles}      accent="info" />
            <KpiCard label="Atención humana"   value={real.human}        icon={Repeat}        accent="accent" suffix="%" />
          </>
        )}
      </div>

      {/* Distribución de conversaciones */}
      <div className="premium-card p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">Distribución de conversaciones</h3>
            {isRefreshing && <RefreshCw className="w-3 h-3 text-muted-foreground animate-spin" />}
          </div>
          <div className="flex items-center gap-0.5 bg-secondary rounded-md p-0.5">
            {TIME_RANGES.map(r => (
              <button key={r.label} onClick={() => setHours(r.hours)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  hours === r.hours
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}>
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Por canal */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted-foreground font-medium">Por canal</p>
              {real.byChannel.length > 0 && <span className="text-[10px] text-emerald-400">● live</span>}
            </div>
            <div className="h-[220px]">
              {real.chartsLoading
                ? <PieSkeleton size={220} />
                : real.byChannel.length > 0
                  ? <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={real.byChannel} dataKey="value" nameKey="name" outerRadius={80} label={(e) => e.name}>
                          {real.byChannel.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={TOOLTIP_STYLE} />
                      </PieChart>
                    </ResponsiveContainer>
                  : <EmptyData />
              }
            </div>
          </div>

          {/* Por horario */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted-foreground font-medium">Por horario</p>
              {real.byHour.length > 0 && <span className="text-[10px] text-emerald-400">● live</span>}
            </div>
            <div className="h-[220px]">
              {real.chartsLoading
                ? <ChartSkeleton height={220} />
                : real.byHour.length > 0
                  ? <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={real.byHour} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} />
                        <Line type="monotone" dataKey="value" stroke="hsl(var(--accent))" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  : <EmptyData />
              }
            </div>
          </div>

          {/* Por intención */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted-foreground font-medium">Por intención</p>
              {real.byIntent.length > 0 && <span className="text-[10px] text-emerald-400">● live</span>}
            </div>
            <div className="h-[220px]">
              {real.chartsLoading
                ? <ChartSkeleton height={220} />
                : real.byIntent.length > 0
                  ? <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={real.byIntent} layout="vertical" margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                        <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                        <YAxis dataKey="intent" type="category" stroke="hsl(var(--muted-foreground))" fontSize={10} width={110} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} />
                        <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                          {real.byIntent.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  : <EmptyData />
              }
            </div>
          </div>
        </div>
      </div>

      <ChatExplorer apiSlug={tenant.apiSlug} />
    </div>
  );
}
