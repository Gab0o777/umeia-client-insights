import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { SectionHeader } from "@/components/SectionHeader";
import { KpiCard } from "@/components/KpiCard";
import { ArrowRightLeft, Bot, Headset, ListTree, MessagesSquare, UserCheck } from "lucide-react";
import { useActivitySummary } from "@/hooks/useActivitySummary";
import { useLeadStatusReport } from "@/hooks/useLeadStatusReport";
import { ColumnStatusCards } from "@/components/ColumnStatusCards";
import { EcommerceActivitySection } from "@/components/EcommerceActivitySection";
import { ActivityExplorer } from "@/components/ActivityExplorer";
import { KpiSkeleton } from "@/components/Skeleton";

const TIME_RANGES = [
  { label: "1h",  hours: 1   }, { label: "6h",  hours: 6   },
  { label: "24h", hours: 24  }, { label: "7d",  hours: 168 },
  { label: "30d", hours: 720 },
];

export default function Actividad() {
  const { tenant } = useAuth();
  const [hours, setHours] = useState(24);
  const summary = useActivitySummary(tenant?.apiSlug, hours);
  const report = useLeadStatusReport(tenant?.apiSlug);
  if (!tenant) return null;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Actividad"
        description={`${tenant.name} — eventos del sistema: leads movidos de columna y respuestas al lead.`}
        actions={
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
        }
      />

      {/* ── Actividad general ── */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actividad general</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {summary.loading
            ? <KpiSkeleton />
            : <KpiCard label="Total eventos" value={summary.total} icon={ListTree} accent="primary" />
          }
          {summary.loading
            ? <KpiSkeleton />
            : <KpiCard label="Leads movidos de columna" value={summary.leadMovedColumn} icon={ArrowRightLeft} accent="accent" />
          }
          {summary.loading
            ? <KpiSkeleton />
            : <KpiCard label="Respuestas del bot" value={summary.botReply} icon={Bot} accent="success" />
          }
          {summary.loading
            ? <KpiSkeleton />
            : <KpiCard label="Respuestas de agentes CRM" value={summary.humanAgentReply} icon={Headset} accent="warning" />
          }
        </div>
      </div>

      {/* ── Actividad del CRM ── */}
      <ColumnStatusCards apiSlug={tenant.apiSlug} />

      {/* ── Actividad de Tienda Nube (solo si está conectada) ── */}
      <EcommerceActivitySection apiSlug={tenant.apiSlug} hours={hours} />

      {/* ── Actividad respuesta humana ── */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actividad respuesta humana</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {summary.loading
            ? <KpiSkeleton />
            : (
              <KpiCard
                label="Mensajes respondidos"
                value={summary.humanAgentReply}
                icon={MessagesSquare}
                accent="warning"
                subtitle="Eventos de respuesta detectados"
              />
            )
          }
          {summary.loading
            ? <KpiSkeleton />
            : (
              <KpiCard
                label="Conversaciones respondidas"
                value={summary.humanAgentReplyConversations}
                icon={UserCheck}
                accent="warning"
                subtitle="Leads distintos con al menos una respuesta"
              />
            )
          }
        </div>
        <ActivityExplorer
          apiSlug={tenant.apiSlug}
          title="Respuestas de agentes"
          fixedType="human_agent_reply"
          crmSubdomain={report.crm?.subdomain}
        />
      </div>
    </div>
  );
}
