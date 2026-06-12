import { useAuth } from "@/context/AuthContext";
import { SectionHeader } from "@/components/SectionHeader";
import { KpiCard } from "@/components/KpiCard";
import { Bot, User } from "lucide-react";
import { useRealMetrics } from "@/hooks/useRealMetrics";
import { KpiSkeleton, ComingSoon } from "@/components/Skeleton";

export default function Automatizacion() {
  const { tenant } = useAuth();
  const real = useRealMetrics(tenant?.apiSlug);
  if (!tenant) return null;

  return (
    <div className="space-y-6">
      <SectionHeader title="Automatización" description={`Eficiencia operativa de ${tenant.name}.`} />

      <div className="grid gap-4 sm:grid-cols-2">
        {real.loading ? (
          <><KpiSkeleton /><KpiSkeleton /></>
        ) : (
          <>
            <KpiCard label="Respuestas automáticas" value={real.automation} icon={Bot}  accent="accent" suffix="%" subtitle="del total de mensajes" />
            <KpiCard label="Atención humana"         value={real.human}     icon={User} accent="info"   suffix="%" subtitle="requirieron agente" />
          </>
        )}
      </div>

      <div className="premium-card p-5">
        <h3 className="text-sm font-semibold mb-4">Automatización por proceso</h3>
        <ComingSoon
          title="Próximamente"
          description="El desglose por proceso se conectará al backend en una próxima versión."
        />
      </div>
    </div>
  );
}
