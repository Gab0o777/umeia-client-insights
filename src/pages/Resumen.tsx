import { useAuth } from "@/context/AuthContext";
import { SectionHeader } from "@/components/SectionHeader";
import { KpiCard } from "@/components/KpiCard";
import { useLiveTraffic } from "@/hooks/useLiveTraffic";
import { useRealMetrics } from "@/hooks/useRealMetrics";
import {
  MessageSquare, Activity, Bot, User, Target, Timer, Clock, DollarSign,
  Wifi, Cloud, Database, Sparkles, Megaphone, AlertTriangle, Info, CheckCircle2,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { cn } from "@/lib/utils";

const CHART_COLORS = {
  primary: "hsl(var(--primary))",
  accent: "hsl(var(--accent))",
  info: "hsl(var(--info))",
  success: "hsl(var(--success))",
  warning: "hsl(var(--warning))",
  muted: "hsl(var(--muted-foreground))",
};

function ChartCard({ title, subtitle, children, className }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("premium-card p-5", className)}>
      <div className="mb-4">
        <h3 className="text-sm font-semibold">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      <div className="h-[260px]">{children}</div>
    </div>
  );
}

function StatusPill({ ok, label, sub }: { ok: boolean; label: string; sub?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/40 px-4 py-3">
      <div className="min-w-0">
        <div className="text-sm font-medium truncate">{label}</div>
        {sub && <div className="text-xs text-muted-foreground truncate">{sub}</div>}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className={cn("pulse-dot", ok ? "bg-success" : "bg-muted-foreground")} />
        <span className={cn("text-xs font-semibold", ok ? "text-success" : "text-muted-foreground")}>
          {ok ? "Activo" : "Inactivo"}
        </span>
      </div>
    </div>
  );
}

const ALERT_STYLES = {
  info: { icon: Info, cls: "border-info/30 bg-info/5 text-info" },
  warning: { icon: AlertTriangle, cls: "border-warning/30 bg-warning/5 text-warning" },
  success: { icon: CheckCircle2, cls: "border-success/30 bg-success/5 text-success" },
};

export default function Resumen() {
  const { tenant, user } = useAuth();
  const real = useRealMetrics(tenant?.apiSlug);
  const { messages, syncLabel } = useLiveTraffic(
    real.messages ?? tenant?.kpis.messages ?? 0
  );
  if (!tenant) return null;

  // Real data where available — null means "no tenemos este dato real aún"
  const kpis = {
    messages:     real.messages     ?? tenant.kpis.messages,
    activeConvos: real.activeConvos ?? null,
    automation:   real.automation   ?? null,
    human:        real.human        ?? null,
    leads:        real.leads        ?? null,
    avgResponseSec: null as number | null,   // sin endpoint real aún
    hoursSaved:     null as number | null,   // sin endpoint real aún
    monthlyCost:    null as number | null,   // sin endpoint real aún
  };


  // Mensajes por día: datos reales si disponibles, fallback al mock
  const messagesByDay = real.messagesByDay.length > 0
    ? real.messagesByDay
    : tenant.messagesByDay;


  return (
    <div className="space-y-6">
      <SectionHeader
        title="Resumen general"
        description={`${tenant.name} — visualización en vivo de la operación UMEIA.`}
        actions={
          <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5">
            <span className="pulse-dot bg-success" />
            <span className="text-xs font-medium">En vivo · sync {syncLabel}</span>
          </div>
        }
      />

      {/* Alertas — temporalmente ocultas */}
      {/* {tenant.alerts.length > 0 && ( ... )} */}

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Mensajes recibidos" value={messages} icon={MessageSquare} accent="primary" subtitle="Mes en curso" />
        <KpiCard label="Conversaciones activas" value={kpis.activeConvos} icon={Activity} accent="info" />
        <KpiCard label="Automatización" value={kpis.automation} suffix="%" icon={Bot} accent="success" />
        <KpiCard label="Intervención humana" value={kpis.human} suffix="%" icon={User} accent="accent" />
        <KpiCard label="Leads / casos" value={kpis.leads} icon={Target} accent="primary" />
        <KpiCard label="Tiempo de respuesta" value={kpis.avgResponseSec} suffix="s" icon={Timer} accent="info" subtitle="Próximamente" />
        <KpiCard label="Tiempo ahorrado" value={kpis.hoursSaved} suffix="h" icon={Clock} accent="success" subtitle="Próximamente" />
        <KpiCard label="Costo total" value={kpis.monthlyCost} prefix="USD " icon={DollarSign} accent="warning" subtitle="Próximamente" />
      </div>

      {/* Gráficos */}
      <ChartCard title="Mensajes por día" subtitle="Últimos 14 días — automático vs humano">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={messagesByDay} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gAuto" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS.primary} stopOpacity={0.5} />
                <stop offset="100%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gHuman" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS.accent} stopOpacity={0.5} />
                <stop offset="100%" stopColor={CHART_COLORS.accent} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
            <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Area type="monotone" dataKey="auto" name="Automático" stroke={CHART_COLORS.primary} fill="url(#gAuto)" strokeWidth={2} />
            <Area type="monotone" dataKey="human" name="Humano" stroke={CHART_COLORS.accent} fill="url(#gHuman)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Estado */}
      <div className="premium-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-8 w-8 rounded-lg bg-gradient-primary text-primary-foreground flex items-center justify-center">
            <Sparkles className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-semibold">Estado del sistema</h3>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
          <StatusPill ok={tenant.whatsapp.connected} label="WhatsApp" sub={tenant.whatsapp.number} />
          <StatusPill ok={tenant.whatsapp.cloudApi} label="WhatsApp Cloud API" sub={tenant.whatsapp.cloudApi ? "Activa" : "No activa"} />
          <StatusPill ok={true} label="CRM" sub="Sincronizado" />
          <StatusPill ok={true} label="IA" sub={tenant.costs.aiProvider} />
          <StatusPill ok={true} label="Ads tracking" sub="Meta + Google" />
        </div>
      </div>

      {/* "Qué hizo UMEIA por usted este mes" */}
      <div className="premium-card relative overflow-hidden p-6 sm:p-8">
        <div className="absolute inset-0 bg-gradient-glow opacity-60 pointer-events-none" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-3 py-1 text-primary-foreground text-xs font-semibold">
            <Sparkles className="h-3 w-3" /> Resumen ejecutivo
          </div>
          <h2 className="mt-4 text-2xl sm:text-3xl font-bold tracking-tight">
            Qué hizo UMEIA por <span className="gradient-text">{tenant.name}</span> este mes
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: MessageSquare, label: "Mensajes procesados", value: kpis.messages != null ? kpis.messages.toLocaleString("es-AR") : "—" },
              { icon: Bot, label: "Respuestas automáticas", value: kpis.automation != null ? `${kpis.automation}%` : "—" },
              { icon: Clock, label: "Horas ahorradas", value: "—" },
              { icon: Target, label: "Leads generados", value: kpis.leads != null ? kpis.leads.toLocaleString("es-AR") : "—" },
            ].map((item, i) => (
              <div key={i} className="rounded-xl border border-border bg-card/80 p-4 backdrop-blur">
                <item.icon className="h-5 w-5 text-primary mb-2" />
                <div className="text-2xl font-bold tracking-tight">{item.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Campañas del período — temporalmente oculta */}
    </div>
  );
}
