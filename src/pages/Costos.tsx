import { useAuth } from "@/context/AuthContext";
import { SectionHeader } from "@/components/SectionHeader";
import { ComingSoon } from "@/components/Skeleton";

export default function Costos() {
  const { tenant } = useAuth();
  if (!tenant) return null;
  return (
    <div className="space-y-6">
      <SectionHeader title="Costos" description={`Costos operativos de ${tenant.name}.`} />
      <div className="premium-card p-5">
        <ComingSoon
          title="Sección en desarrollo"
          description="El desglose de costos de IA, WhatsApp y operativos se integrará en una próxima versión."
        />
      </div>
    </div>
  );
}
