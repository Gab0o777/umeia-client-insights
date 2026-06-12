import { useAuth } from "@/context/AuthContext";
import { SectionHeader } from "@/components/SectionHeader";
import { KpiCard } from "@/components/KpiCard";
import { useLiveTraffic } from "@/hooks/useLiveTraffic";
import { useRealMetrics } from "@/hooks/useRealMetrics";
import { MessageSquare, Activity, Bot, User, Target, Wifi, Cloud, Database, Sparkles } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { cn } from "@/lib/utils";
import { KpiSkeleton, ChartSkeleton } from "@/components/Skeleton";

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

const TOOLTIP_STYLE = {
  background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))",
  borderRadius: 8, fontSize: 12,
};

export default function Resumen() {
  const { tenant } = useAuth();
  const real = useRealMetrics(tenant?.apiSlug, 24);
  const { messages, syncLabel } = useLiveTraffic(real.messages ?? 0);
  if (!tenant) return null;

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

      {/* Cada KPI card carga de forma independiente */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {real.messagesLoading
          ? <KpiSkeleton />
          : <KpiCard label="Mensajes"        value={messages}          icon={MessageSquare} accent="primary" subtitle={`últimas 24h · sync ${syncLabel}`} />
        }
        {real.convosLoading
          ? <KpiSkeleton />
          : <KpiCard label="Conversaciones"  value={real.activeConvos} icon={Activity}      accent="info" />
        }
        {real.automationLoading
          ? <KpiSkeleton />
          : <KpiCard label="Automatización"  value={real.automation}   icon={Bot}           accent="accent" suffix="%" subtitle="del total de mensajes" />
        }
        {real.leadsLoading
          ? <KpiSkeleton />
          : <KpiCard label="Leads"           value={real.leads}        icon={Target}        accent="success" />
        }
      </div>

      {/* Gráfico mensajes por día */}
      <div className="premium-card p-5">
        <div className="mb-4">
          <h3 className="text-sm font-semibold">Actividad — últimos 14 días</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Mensajes automáticos vs. humanos</p>
        </div>
        {real.messagesByDayLoading ? (
          <ChartSkeleton height={260} />
        ) : real.messagesByDay.length > 0 ? (
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={real.messagesByDay} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis             stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="auto"  name="Automático" stackId="a" fill="hsl(var(--primary))"       radius={[0,0,0,0]} />
                <Bar dataKey="human" name="Humano"     stackId="a" fill="hsl(var(--accent))"  radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[260px] flex items-center justify-center">
            <p className="text-xs text-muted-foreground">Sin datos en el período</p>
          </div>
        )}
      </div>

      {/* Estado del sistema */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="premium-card p-5">
          <h3 className="text-sm font-semibold mb-4">Estado del sistema</h3>
          <div className="space-y-2.5">
            <StatusPill ok={tenant.whatsapp.connected} label="WhatsApp"           sub={tenant.whatsapp.number} />
            <StatusPill ok={tenant.whatsapp.cloudApi}  label="WhatsApp Cloud API" sub={tenant.whatsapp.cloudApi ? "Activa" : "No activa"} />
            <StatusPill ok={true}                      label="Motor UMEIA"         sub="Procesando mensajes" />
            <StatusPill ok={true}                      label="Base de datos"       sub="Conexión estable" />
          </div>
        </div>
        <div className="premium-card p-5">
          <h3 className="text-sm font-semibold mb-4">Configuración</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              {tenant.type === "cloud"
                ? <Cloud className="w-4 h-4 text-info shrink-0" />
                : <Database className="w-4 h-4 text-accent shrink-0" />}
              <div>
                <div className="font-medium">{tenant.type === "cloud" ? "Cloud" : "On-Premise"}</div>
                <div className="text-xs text-muted-foreground">{tenant.whatsapp.mode}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Wifi className="w-4 h-4 text-success shrink-0" />
              <div>
                <div className="font-medium">WhatsApp</div>
                <div className="text-xs text-muted-foreground">{tenant.whatsapp.number}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Sparkles className="w-4 h-4 text-accent shrink-0" />
              <div>
                <div className="font-medium">IA activa</div>
                <div className="text-xs text-muted-foreground">{tenant.verticalLabel}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
