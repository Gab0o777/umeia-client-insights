import { useAuth } from "@/context/AuthContext";
import { SectionHeader } from "@/components/SectionHeader";
import {
  MessageCircle, FileText, Database, Cpu, Workflow, Megaphone, Wallet, Plug, Server, Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS: Record<string, any> = {
  WhatsApp: MessageCircle,
  Formularios: FileText,
  CRM: Database,
  IA: Cpu,
  Automatización: Workflow,
  "Ads tracking": Megaphone,
  "Cost control": Wallet,
  "Integración interna": Plug,
  "Nodo local": Server,
  "Derivación humana": Users,
};

const STATUS_STYLE = {
  active: { dot: "bg-success", label: "Activo", text: "text-success", ring: "ring-success/20" },
  partial: { dot: "bg-warning", label: "Parcial", text: "text-warning", ring: "ring-warning/20" },
  inactive: { dot: "bg-muted-foreground", label: "Inactivo", text: "text-muted-foreground", ring: "ring-muted-foreground/10" },
};

export default function Modulos() {
  const { tenant } = useAuth();
  if (!tenant) return null;

  return (
    <div className="space-y-6">
      <SectionHeader title="Módulos" description="Capacidades activas en tu instancia UMEIA." />

      {/* WhatsApp destacado — temporalmente oculto */}
      {/* <div className="premium-card relative overflow-hidden p-6"> ... </div> */}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {tenant.modules.filter((m) => m.name !== "WhatsApp").map((m, i) => {
          const Icon = ICONS[m.name] ?? Plug;
          const s = STATUS_STYLE[m.status];
          return (
            <div
              key={m.name}
              className="premium-card p-5"
              style={{ animation: `fade-in 0.45s ease-out ${i * 0.05}s both` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className={cn("h-10 w-10 rounded-xl bg-secondary flex items-center justify-center ring-2", s.ring)}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={cn("pulse-dot", s.dot)} />
                  <span className={cn("text-[11px] font-semibold uppercase tracking-wider", s.text)}>{s.label}</span>
                </div>
              </div>
              <div className="mt-4 font-semibold">{m.name}</div>
              <div className="text-xs text-muted-foreground mt-1">{m.description}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
