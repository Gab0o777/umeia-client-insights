import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { SectionHeader } from "@/components/SectionHeader";
import { KpiSkeleton, EmptyData } from "@/components/Skeleton";
import {
  Cpu, Users, ListTree, Sparkles, BookOpen, ShoppingCart,
  Clock, Tag, Zap, CheckCircle2, MinusCircle, LucideIcon,
} from "lucide-react";

const API_BASE = import.meta.env.DEV
  ? "/umeia-api"
  : (import.meta.env.VITE_API_URL ?? "https://umeia.space");

interface ModuleInfo {
  id: string;
  name: string;
  description: string;
  active: boolean;
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
};

export default function Modulos() {
  const { tenant } = useAuth();
  const [data, setData] = useState<ModulesResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!tenant?.apiSlug) return;
    let cancelled = false;
    setLoading(true);
    setError(false);

    fetch(`${API_BASE}/api/metrics/modules?tenant_id=${encodeURIComponent(tenant.apiSlug)}`)
      .then(res => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((json: ModulesResp) => { if (!cancelled) setData(json); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [tenant?.apiSlug]);

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
            {activos.map(m => {
              const Icon = MODULE_ICONS[m.id] ?? Cpu;
              return (
                <div key={m.id} className="premium-card p-5 border-success/30">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-9 h-9 rounded-lg bg-success/10 text-success flex items-center justify-center">
                      <Icon className="w-4.5 h-4.5" size={18} />
                    </div>
                    <span className="flex items-center gap-1 text-[11px] font-medium text-success">
                      <CheckCircle2 size={12} /> Activo
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold">{m.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{m.description}</p>
                </div>
              );
            })}
          </div>

          {inactivos.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-3">Disponibles (no contratados)</p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {inactivos.map(m => {
                  const Icon = MODULE_ICONS[m.id] ?? Cpu;
                  return (
                    <div key={m.id} className="premium-card p-5 opacity-60">
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-9 h-9 rounded-lg bg-secondary text-muted-foreground flex items-center justify-center">
                          <Icon size={18} />
                        </div>
                        <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                          <MinusCircle size={12} /> Inactivo
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-muted-foreground">{m.name}</h3>
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{m.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
