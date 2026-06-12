import { useAuth } from "@/context/AuthContext";
import { SectionHeader } from "@/components/SectionHeader";
import { ComingSoon } from "@/components/Skeleton";

export default function Tickets() {
  const { tenant } = useAuth();
  if (!tenant) return null;
  return (
    <div className="space-y-6">
      <SectionHeader title="Tickets" description={`Soporte técnico de ${tenant.name}.`} />
      <div className="premium-card p-5">
        <ComingSoon
          title="Sección en desarrollo"
          description="El sistema de tickets de soporte se conectará en una próxima versión."
        />
      </div>
    </div>
  );
}
