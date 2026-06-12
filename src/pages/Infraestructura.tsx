import { useAuth } from "@/context/AuthContext";
import { SectionHeader } from "@/components/SectionHeader";
import {
  Cloud, Server, Database, Cpu, Smartphone, Brain, Globe, Shield, Activity, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

function Node({
  icon: Icon, title, sub, accent = "primary",
}: { icon: any; title: string; sub?: string; accent?: "primary" | "accent" | "info" | "success" | "warning" }) {
  const styles = {
    primary: "bg-primary/10 text-primary border-primary/30",
    accent: "bg-accent/10 text-accent border-accent/30",
    info: "bg-info/10 text-info border-info/30",
    success: "bg-success/10 text-success border-success/30",
    warning: "bg-warning/10 text-warning border-warning/30",
  };
  return (
    <div className={cn("rounded-xl border-2 p-4 backdrop-blur transition-all hover:scale-105", styles[accent])}>
      <Icon className="h-6 w-6 mb-2" />
      <div className="text-sm font-semibold text-foreground">{title}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

function FlowArrow({ vertical = false }: { vertical?: boolean }) {
  return (
    <div className={cn("flex items-center justify-center", vertical ? "h-8" : "w-8")}>
      <ArrowRight className={cn("h-4 w-4 text-primary animate-pulse", vertical && "rotate-90")} />
    </div>
  );
}

export default function Infraestructura() {
  const { tenant } = useAuth();
  if (!tenant) return null;

  if (tenant.type === "cloud") {
    return (
      <div className="space-y-6">
        <SectionHeader
          title="Infraestructura — Cloud UMEIA"
          description="Operación 100% en cloud UMEIA con WhatsApp Cloud API activa."
        />

        <div className="premium-card relative overflow-hidden p-8">
          <div className="absolute inset-0 bg-gradient-glow opacity-40 pointer-events-none" />

          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-info/15 border border-info/30 px-3 py-1 text-info text-xs font-semibold mb-6">
              <Cloud className="h-3.5 w-3.5" /> Arquitectura Cloud
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-4 lg:gap-2">
              {/* Canales */}
              <div className="space-y-3">
                <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Canales</div>
                <Node icon={Smartphone} title="WhatsApp Cloud API" sub={tenant.whatsapp.number} accent="success" />
                <Node icon={Globe} title="Web Chat" sub="Sitio + landings" accent="info" />
                <Node icon={Activity} title="Instagram / Email" sub="Conectados" accent="accent" />
              </div>

              <div className="hidden lg:block"><FlowArrow /></div>
              <div className="lg:hidden"><FlowArrow vertical /></div>

              {/* Core UMEIA */}
              <div className="rounded-2xl bg-gradient-primary p-6 text-primary-foreground shadow-glow">
                <div className="text-[11px] uppercase tracking-wider font-bold opacity-80 mb-2">Core</div>
                <div className="text-2xl font-bold mb-3">UMEIA Cloud</div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2"><Brain className="h-4 w-4" /> Interpretación IA</div>
                  <div className="flex items-center gap-2"><Cpu className="h-4 w-4" /> Automatización</div>
                  <div className="flex items-center gap-2"><Shield className="h-4 w-4" /> Decisiones</div>
                </div>
              </div>

              <div className="hidden lg:block"><FlowArrow /></div>
              <div className="lg:hidden"><FlowArrow vertical /></div>

              {/* Integraciones */}
              <div className="space-y-3">
                <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Integraciones</div>
                <Node icon={Database} title="CRM" sub="Sincronizado" accent="primary" />
                <Node icon={Brain} title="IA — OpenAI" sub={tenant.costs.aiModel} accent="accent" />
                <Node icon={Activity} title="Ads tracking" sub="Meta + Google" accent="info" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="premium-card p-5 border-success/30 bg-success/5">
            <div className="flex items-center gap-2 text-success mb-2">
              <Cloud className="h-5 w-5" />
              <span className="font-semibold">Operación 100% en cloud UMEIA</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Toda la infraestructura está gestionada por UMEIA. No requiere mantenimiento, escalado ni servidores propios.
            </p>
          </div>
          <div className="premium-card p-5 border-info/30 bg-info/5">
            <div className="flex items-center gap-2 text-info mb-2">
              <Smartphone className="h-5 w-5" />
              <span className="font-semibold">WhatsApp Cloud API activa</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Conexión directa y oficial con Meta. Mayor velocidad, plantillas oficiales y reportes nativos.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ON-PREMISE
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Infraestructura — Hybrid / On-Premise"
        description="Nodo local en tu infraestructura, sincronizado con el Core UMEIA."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Cliente */}
        <div className="premium-card relative overflow-hidden p-6 border-accent/30">
          <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-accent/15 blur-3xl pointer-events-none" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-accent/15 border border-accent/30 px-3 py-1 text-accent text-xs font-semibold mb-5">
              <Server className="h-3.5 w-3.5" /> Infraestructura del cliente
            </div>
            <h3 className="text-lg font-bold mb-4">{tenant.name} — Servidor on-premise</h3>
            <div className="grid grid-cols-2 gap-3">
              <Node icon={Server} title="Nodo local UMEIA" sub="Activo" accent="accent" />
              <Node icon={Database} title="Sistema de turnos" sub="Integrado" accent="accent" />
              <Node icon={Shield} title="Datos pacientes" sub="En su entorno" accent="warning" />
              <Node icon={Smartphone} title="WhatsApp" sub="Sin Cloud API" accent="warning" />
            </div>
            <div className="mt-5 rounded-lg bg-accent/5 border border-accent/20 p-3 text-xs text-muted-foreground">
              <span className="font-semibold text-accent">🔒 Permanece en su entorno:</span> los datos sensibles de pacientes y el sistema de turnos no salen del servidor del cliente.
            </div>
          </div>
        </div>

        {/* UMEIA */}
        <div className="premium-card relative overflow-hidden p-6 border-primary/30">
          <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/15 border border-primary/30 px-3 py-1 text-primary text-xs font-semibold mb-5">
              <Cloud className="h-3.5 w-3.5" /> Core UMEIA
            </div>
            <h3 className="text-lg font-bold mb-4">Plataforma UMEIA</h3>
            <div className="grid grid-cols-2 gap-3">
              <Node icon={Brain} title="Interpretación IA" accent="primary" />
              <Node icon={Cpu} title="Automatización" accent="primary" />
              <Node icon={Shield} title="Decisiones" accent="info" />
              <Node icon={Activity} title="Costos & métricas" accent="info" />
            </div>
            <div className="mt-5 rounded-lg bg-primary/5 border border-primary/20 p-3 text-xs text-muted-foreground">
              <span className="font-semibold text-primary">⚡ Procesa UMEIA:</span> el Core interpreta, decide y automatiza. Solo intercambia metadatos con el nodo local.
            </div>
          </div>
        </div>
      </div>

      {/* Sincronización */}
      <div className="premium-card p-6">
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <div className="text-center">
            <div className="h-14 w-14 mx-auto rounded-xl bg-accent/15 text-accent flex items-center justify-center"><Server className="h-6 w-6" /></div>
            <div className="text-xs mt-2 font-semibold">Cliente</div>
          </div>
          <div className="flex items-center gap-1">
            <svg width="80" height="20" viewBox="0 0 80 20" className="text-primary">
              <line x1="0" y1="10" x2="80" y2="10" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" className="animate-data-flow" style={{ strokeDashoffset: 0 }} />
            </svg>
            <span className="pulse-dot bg-success" />
          </div>
          <div className="text-center">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Sync</div>
            <div className="text-sm font-semibold">{tenant.whatsapp.lastSync}</div>
          </div>
          <div className="flex items-center gap-1">
            <span className="pulse-dot bg-success" />
            <svg width="80" height="20" viewBox="0 0 80 20" className="text-primary">
              <line x1="0" y1="10" x2="80" y2="10" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" className="animate-data-flow" />
            </svg>
          </div>
          <div className="text-center">
            <div className="h-14 w-14 mx-auto rounded-xl bg-primary/15 text-primary flex items-center justify-center"><Cloud className="h-6 w-6" /></div>
            <div className="text-xs mt-2 font-semibold">UMEIA</div>
          </div>
        </div>
      </div>
    </div>
  );
}
