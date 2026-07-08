import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { SectionHeader } from "@/components/SectionHeader";
import { KpiCard } from "@/components/KpiCard";
import { useLiveTraffic } from "@/hooks/useLiveTraffic";
import { useRealMetrics } from "@/hooks/useRealMetrics";
import { useCosts, costPrefix } from "@/hooks/useCosts";
import { useSavedHours, formatSavedHours, MINUTES_PER_AUTO_ACTION } from "@/hooks/useSavedHours";
import {
  MessageSquare, Activity, Bot, Target, Clock,
  Cloud, Users, Sparkles, ExternalLink, X, DollarSign,
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { cn } from "@/lib/utils";
import { KpiSkeleton, ChartSkeleton, Skeleton } from "@/components/Skeleton";
import { createPortal } from "react-dom";

// ─── Status pill ─────────────────────────────────────────────

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

// ─── Kommo modal ──────────────────────────────────────────────

function KommoModal({ apiSlug, onClose }: { apiSlug: string; onClose: () => void }) {
  const url = `https://${apiSlug}.kommo.com`;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 animate-fade-in">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">CRM Kommo</h3>
              <p className="text-xs text-muted-foreground">Gestión de leads y contactos</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 mb-5">
          <div className="rounded-xl bg-secondary/40 border border-border px-4 py-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">URL del CRM</p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-mono text-accent hover:underline flex items-center gap-1.5 truncate"
            >
              {url}
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
          </div>
          <div className="rounded-xl bg-secondary/40 border border-border px-4 py-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Estado</span>
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <span className="pulse-dot bg-success" /> Conectado
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Integración</span>
              <span className="font-medium">UMEIA → Kommo</span>
            </div>
          </div>
        </div>

        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-violet-500 hover:bg-violet-600 text-white text-sm font-semibold transition-colors"
        >
          Abrir Kommo <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>,
    document.body
  );
}

// ─── Config row clickable ─────────────────────────────────────

function ConfigRow({
  icon, label, sub, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  sub: string;
  onClick?: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border border-border/50 px-4 py-3 transition-colors",
        onClick ? "cursor-pointer hover:border-accent/40 hover:bg-secondary/40" : "bg-transparent"
      )}
      onClick={onClick}
    >
      <div className="shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground truncate">{sub}</div>
      </div>
      {onClick && <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────

const TOOLTIP_STYLE = {
  background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))",
  borderRadius: 8, fontSize: 12,
};

export default function Resumen() {
  const { tenant } = useAuth();
  const real = useRealMetrics(tenant?.apiSlug, 24);
  const costs = useCosts(tenant?.apiSlug, 720); // costo del mes corriente
  const saved = useSavedHours(tenant?.apiSlug, 720); // horas ahorradas del mes
  const navigate = useNavigate();
  const { messages, syncLabel } = useLiveTraffic(real.messages ?? 0);
  const [showKommo, setShowKommo] = useState(false);
  if (!tenant) return null;

  const kpis = {
    messages:   real.messages,
    automation: real.automation,
    leads:      real.leads,
  };


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

      {/* KPIs — cada uno carga de forma independiente */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {real.messagesLoading
          ? <KpiSkeleton />
          : <KpiCard label="Mensajes"       value={messages}          icon={MessageSquare} accent="primary" subtitle={`últimas 24h · sync ${syncLabel}`} />
        }
        {real.convosLoading
          ? <KpiSkeleton />
          : <KpiCard label="Conversaciones" value={real.activeConvos} icon={Activity}      accent="info" />
        }
        {real.automationLoading
          ? <KpiSkeleton />
          : <KpiCard label="Automatización" value={real.automation}   icon={Bot}           accent="accent" suffix="%" subtitle="del total de mensajes" />
        }
        {real.leadsLoading
          ? <KpiSkeleton />
          : <KpiCard label="Leads"          value={real.leads}        icon={Target}        accent="success" />
        }
        {/* Card de costos — solo con datos reales de Meta (módulo conectado y sin error) */}
        {costs.data?.module_enabled && !costs.data.error && costs.data.total_cost_usd != null && (
          <div
            role="button"
            tabIndex={0}
            onClick={() => navigate("/costos")}
            onKeyDown={e => e.key === "Enter" && navigate("/costos")}
            className="cursor-pointer transition-transform hover:scale-[1.02] focus:outline-none"
            title="Ver detalle de costos"
          >
            <KpiCard
              label="Costo WhatsApp"
              value={costs.data.total_cost_usd}
              prefix={costPrefix(costs.data.currency)}
              decimals={2}
              icon={DollarSign}
              accent="warning"
              subtitle="últimos 30 días · real (Meta) — click para detalle"
            />
          </div>
        )}
      </div>

      {/* Gráfico mensajes por día */}
      <div className="premium-card p-5">
        <div className="mb-4">
          <h3 className="text-sm font-semibold">Actividad — últimos 14 días</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Mensajes automáticos vs. humanos por día</p>
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
                <Bar dataKey="auto"  name="Automático" stackId="a" fill="hsl(var(--primary))" radius={[0,0,0,0]} />
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

      {/* Estado del sistema + Configuración */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Estado del sistema — solo servicios UMEIA */}
        <div className="premium-card p-5">
          <h3 className="text-sm font-semibold mb-4">Estado del sistema</h3>
          <div className="space-y-2.5">
            <StatusPill ok={true} label="Motor UMEIA" sub="Procesando mensajes" />
            <StatusPill ok={true} label="CRM Kommo"   sub={`${tenant.apiSlug}.kommo.com`} />
          </div>
        </div>

        {/* Configuración */}
        <div className="premium-card p-5">
          <h3 className="text-sm font-semibold mb-4">Configuración</h3>
          <div className="space-y-2">
            <ConfigRow
              icon={<Cloud className="w-4 h-4 text-info" />}
              label="Cloud API directa"
              sub={tenant.whatsapp.mode}
            />
            <ConfigRow
              icon={<Users className="w-4 h-4 text-violet-400" />}
              label="CRM Kommo"
              sub={`${tenant.apiSlug}.kommo.com`}
              onClick={() => setShowKommo(true)}
            />
          </div>
        </div>
      </div>

      {/* Qué hizo UMEIA por usted este mes */}
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
            {([
              { icon: MessageSquare, label: "Mensajes procesados",    value: kpis.messages   != null ? kpis.messages.toLocaleString("es-AR")   : "—" },
              { icon: Bot,           label: "Respuestas automáticas", value: kpis.automation != null ? `${kpis.automation}%`                    : "—" },
              {
                icon: Clock,
                label: "Horas ahorradas",
                value: saved.savedHours != null ? formatSavedHours(saved.savedHours) : "—",
                hint: `estimado · ${MINUTES_PER_AUTO_ACTION} min por conversación automatizada`,
              },
              { icon: Target,        label: "Leads generados",        value: kpis.leads      != null ? kpis.leads.toLocaleString("es-AR")       : "—" },
            ] as { icon: typeof Clock; label: string; value: string; hint?: string }[]).map((item, i) => (
              <div key={i} className="rounded-xl border border-border bg-card/80 p-4 backdrop-blur">
                <item.icon className="h-5 w-5 text-primary mb-2" />
                <div className="text-2xl font-bold tracking-tight">{item.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{item.label}</div>
                {item.hint && (
                  <div className="text-[10px] text-muted-foreground/70 mt-0.5">{item.hint}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {showKommo && (
        <KommoModal apiSlug={tenant.apiSlug} onClose={() => setShowKommo(false)} />
      )}
    </div>
  );
}
