import { useAuth } from "@/context/AuthContext";
import { SectionHeader } from "@/components/SectionHeader";
import { ComingSoon } from "@/components/Skeleton";

export default function Campanas() {
  const { tenant } = useAuth();
  if (!tenant) return null;
  return (
    <div className="space-y-6">
      <SectionHeader title="Campañas" description={`Campañas de WhatsApp de ${tenant.name}.`} />
      <div className="premium-card p-5">
        <ComingSoon
          title="Sección en desarrollo"
          description="El historial de campañas y sus métricas se integrarán en una próxima versión."
        />
      </div>
    </div>
  );
}
