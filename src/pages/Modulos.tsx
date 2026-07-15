import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { SectionHeader } from "@/components/SectionHeader";
import { KpiSkeleton, EmptyData } from "@/components/Skeleton";
import { CostConnectWizard } from "@/components/CostConnectWizard";
import {
  Cpu, Users, ListTree, Sparkles, BookOpen, ShoppingCart,
  Clock, Tag, Zap, DollarSign, Megaphone, CheckCircle2, MinusCircle, LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE = import.meta.env.DEV
  ? "/umeia-api"
  : (import.meta.env.VITE_API_URL ?? "https://umeia.space");

interface ModuleInfo {
  id: string;
  name: string;
  description: string;
  active: boolean;
  togglable?: boolean;
  requires_connection?: boolean;
  connected?: boolean;
}
interface ModulesResp {
  tenant_id: string;
  modules: ModuleInfo[];
  active_count: number;
  total_count: number;
}

const MODULE_ICONS: Record<string, LucideIcon> = {
  umeia_core:       Cpu,
  crm:              Users,
  menu:             ListTree,
  ai:               Sparkles,
  knowledge_base:   BookOpen,
  ecommerce:        ShoppingCart,
  scheduler:        Clock,
  attention_badge:  Tag,
  flow_automations: Zap,
  costos:           DollarSign,
  costos_ads:       Megaphone,
};

function ToggleSwitch({ on, busy, onToggle }: { on: boolean; busy: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      disabled={busy}
      aria-label={on ? "Desactivar módulo" : "Activar módulo"}
      className={cn(
        "relative w-9 h-5 rounded-full transition-colors shrink-0",
        on ? "bg-success" : "bg-secondary border border-border",
        busy && "opacity-50 cursor-wait",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 w-4 h-4 rounded-full bg-background shadow transition-transform",
          on ? "translate-x-[18px]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

function ModuleCard({
  mod, busy, onToggle, onReconnect,
}: { mod: ModuleInfo; busy: boolean; onToggle: (m: ModuleInfo) => void; onReconnect?: (m: ModuleInfo) => void }) {
  const Icon = MODULE_ICONS[mod.id] ?? Cpu;
  return (
    <div className={cn("premium-card p-5", mod.active ? "border-success/30" : "opacity-70")}>
      <div className="flex items-start justify-between mb-3">
        <div className={cn(
          "w-9 h-9 rounded-lg flex items-center justify-center",
          mod.active ? "bg-success/10 text-success" : "bg-secondary text-muted-foreground",
        )}>
          <Icon size={18} />
        </div>
        {mod.togglable ? (
          <ToggleSwitch on={mod.active} busy={busy} onToggle={() => onToggle(mod)} />
        ) : (
          <span className={cn(
            "flex items-center gap-1 text-[11px] font-medium",
            mod.active ? "text-success" : "text-muted-foreground",
          )}>
            {mod.active ? <><CheckCircle2 size={12} /> Activo</> : <><MinusCircle size={12} /> Inactivo</>}
          </span>
        )}
      </div>
      <h3 className={cn("text-sm font-semibold", !mod.active && "text-muted-foreground")}>{mod.name}</h3>
      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{mod.description}</p>
      {mod.requires_connection && mod.connected && onReconnect && (
        <button
          onClick={() => onReconnect(mod)}
          className="mt-3 text-xs text-accent hover:underline"
        >
          Actualizar credenciales de Meta
        </button>
      )}
    </div>
  );
}

export default function Modulos() {
  const { tenant } = useAuth();
  const [data, setData] = useState<ModulesResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);

  const load = useCallback(() => {
    if (!tenant?.apiSlug) return;
    setLoading(true);
    setError(false);
    fetch(`${API_BASE}/api/metrics/modules?tenant_id=${encodeURIComponent(tenant.apiSlug)}`)
      .then(res => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((json: ModulesResp) => setData(json))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [tenant?.apiSlug]);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (mod: ModuleInfo) => {
    if (!tenant?.apiSlug || togglingId) return;
    const next = !mod.active;

    // Módulos que requieren conexión: la ACTIVACIÓN pasa por el wizard,
    // que valida la cuenta contra Meta antes de activar nada.
    if (next && mod.requires_connection && !mod.connected) {
      setWizardOpen(true);
      return;
    }

    setTogglingId(mod.id);
    // optimista — revertimos si falla
    setData(prev => prev && {
      ...prev,
      modules: prev.modules.map(m => (m.id === mod.id ? { ...m, active: next } : m)),
      active_count: prev.active_count + (next ? 1 : -1),
    });
    try {
      const res = await fetch(`${API_BASE}/api/metrics/modules/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant_id: tenant.apiSlug, module_id: mod.id, enabled: next }),
      });
      if (!res.ok) throw new Error(String(res.status));
    } catch {
      setData(prev => prev && {
        ...prev,
        modules: prev.modules.map(m => (m.id === mod.id ? { ...m, active: mod.active } : m)),
        active_count: prev.active_count + (next ? -1 : 1),
      });
    } finally {
      setTogglingId(null);
    }
  };

  if (!tenant) return null;

  const activos = data?.modules.filter(m => m.active) ?? [];
  const inactivos = data?.modules.filter(m => !m.active) ?? [];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Módulos"
        description={`Módulos activos de ${tenant.name}.`}
        actions={
          data && (
            <span className="text-xs text-muted-foreground bg-secondary rounded-md px-2.5 py-1.5 font-medium">
              {data.active_count} de {data.total_count} activos
            </span>
          )
        }
      />

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <KpiSkeleton key={i} />)}
        </div>
      )}

      {!loading && error && (
        <div className="premium-card p-8">
          <EmptyData message="No se pudo cargar el estado de módulos. Intentá recargar." />
        </div>
      )}

      {!loading && !error && data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activos.map(m => (
              <ModuleCard key={m.id} mod={m} busy={togglingId === m.id} onToggle={handleToggle} onReconnect={() => setWizardOpen(true)} />
            ))}
          </div>

          {inactivos.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-3">Disponibles (no contratados)</p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {inactivos.map(m => (
                  <ModuleCard key={m.id} mod={m} busy={togglingId === m.id} onToggle={handleToggle} onReconnect={() => setWizardOpen(true)} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {wizardOpen && tenant?.apiSlug && (
        <CostConnectWizard
          apiSlug={tenant.apiSlug}
          onClose={() => setWizardOpen(false)}
          onConnected={load}
        />
      )}
    </div>
  );
}
