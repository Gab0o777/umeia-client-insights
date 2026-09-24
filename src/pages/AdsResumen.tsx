import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { SectionHeader } from "@/components/SectionHeader";
import { KpiCard } from "@/components/KpiCard";
import { useZernioTimeline, useZernioCampaigns } from "@/hooks/useZernioAds";
import { DollarSign, MousePointerClick, Target, TrendingUp, ArrowRight } from "lucide-react";
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { KpiSkeleton, ChartSkeleton, ListSkeleton, EmptyData } from "@/components/Skeleton";

const TOOLTIP_STYLE = {
  background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))",
  borderRadius: 8, fontSize: 12,
};
const TIME_RANGES = [
  { label: "7d",  days: 7  },
  { label: "15d", days: 15 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
];

export default function AdsResumen() {
  const { tenant } = useAuth();
  const [days, setDays] = useState(30);
  const { data: timeline, loading: timelineLoading } = useZernioTimeline(tenant?.apiSlug, days);
  const { campaigns, loading: campaignsLoading } = useZernioCampaigns(tenant?.apiSlug);

  if (!tenant) return null;
  // Vista habilitada solo para bligraf por ahora — ver AppSidebar.tsx.
  if (tenant.apiSlug !== "bligraf") return null;

  const summary = timeline?.summary ?? null;
  const topCampaigns = [...(campaigns ?? [])].sort((a, b) => b.spend - a.spend).slice(0, 5);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Advertisement — Resumen"
        description={`Inversión y performance de Google Ads de ${tenant.name}, sincronizado automáticamente.`}
        actions={
          <div className="flex items-center gap-0.5 bg-secondary rounded-md p-0.5">
            {TIME_RANGES.map(r => (
              <button key={r.label} onClick={() => setDays(r.days)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  days === r.days
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}>
                {r.label}
              </button>
            ))}
          </div>
        }
      />

      {timelineLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiSkeleton /><KpiSkeleton /><KpiSkeleton /><KpiSkeleton />
        </div>
      )}

      {!timelineLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Inversión total"
            value={summary?.total_spend ?? null}
            prefix="US$ " decimals={2}
            icon={DollarSign} accent="warning"
            subtitle={`últimos ${days} días`}
          />
          <KpiCard
            label="Clicks"
            value={summary?.total_clicks ?? null}
            icon={MousePointerClick} accent="info"
            subtitle={summary ? `CTR promedio ${summary.avg_ctr.toFixed(2)}%` : undefined}
          />
          <KpiCard
            label="Conversiones"
            value={summary?.total_conversions ?? null}
            decimals={summary && summary.total_conversions % 1 !== 0 ? 1 : 0}
            icon={Target} accent="success"
            subtitle={summary ? `CPA US$ ${(summary.total_conversions ? summary.total_spend / summary.total_conversions : 0).toFixed(2)}` : undefined}
          />
          <KpiCard
            label="ROAS"
            value={summary?.roas ?? null}
            suffix="x" decimals={2}
            icon={TrendingUp} accent="primary"
            subtitle="retorno sobre inversión"
          />
        </div>
      )}

      <div className="premium-card p-5">
        <h3 className="text-sm font-semibold mb-4">Inversión y conversiones por día</h3>
        <div className="h-[280px]">
          {timelineLoading ? (
            <ChartSkeleton height={280} />
          ) : timeline?.rows && timeline.rows.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={timeline.rows} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis yAxisId="spend" stroke="hsl(var(--muted-foreground))" fontSize={11}
                  tickFormatter={(v: number) => `$${v}`} />
                <YAxis yAxisId="conv" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="spend" dataKey="spend" name="Gasto (US$)" fill="hsl(var(--warning))" radius={[6, 6, 0, 0]} />
                <Line yAxisId="conv" type="monotone" dataKey="conversions" name="Conversiones" stroke="hsl(var(--success))" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <EmptyData message="Sin datos sincronizados en este período." />
          )}
        </div>
      </div>

      <div className="premium-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Top campañas por inversión</h3>
          <Link to="/ads/campanas" className="inline-flex items-center gap-1 text-xs text-accent hover:underline">
            Ver todas las campañas <ArrowRight size={12} />
          </Link>
        </div>
        {campaignsLoading && <ListSkeleton rows={3} />}
        {!campaignsLoading && topCampaigns.length === 0 && (
          <EmptyData message="Sin campañas sincronizadas todavía." />
        )}
        {!campaignsLoading && topCampaigns.length > 0 && (
          <div className="space-y-2">
            {topCampaigns.map(c => (
              <div key={c.platform_campaign_id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/40 px-4 py-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{c.name}</div>
                  <div className="text-[11px] text-muted-foreground">{c.status}</div>
                </div>
                <div className="flex items-center gap-5 shrink-0 text-right">
                  <div>
                    <div className="text-sm font-semibold">US$ {c.spend.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</div>
                    <div className="text-[11px] text-muted-foreground">gasto</div>
                  </div>
                  <div className="hidden sm:block">
                    <div className="text-sm font-semibold">{c.roas.toFixed(2)}x</div>
                    <div className="text-[11px] text-muted-foreground">ROAS</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
