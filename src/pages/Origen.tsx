import { useAuth } from "@/context/AuthContext";
import { SectionHeader } from "@/components/SectionHeader";
import { ComingSoon } from "@/components/Skeleton";

export default function Origen() {
  const { tenant } = useAuth();
  if (!tenant) return null;
  return (
    <div className="space-y-6">
      <SectionHeader title="Origen" description={`Fuentes de tráfico de ${tenant.name}.`} />
      <div className="premium-card p-5">
        <ComingSoon
          title="Sección en desarrollo"
          description="El tracking de origen de conversaciones (Meta Ads, Google, orgánico) se integrará en una próxima versión."
        />
      </div>
    </div>
  );
}
