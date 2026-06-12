import { useAuth } from "@/context/AuthContext";
import { SectionHeader } from "@/components/SectionHeader";
import { ComingSoon } from "@/components/Skeleton";

export default function Modulos() {
  const { tenant } = useAuth();
  if (!tenant) return null;
  return (
    <div className="space-y-6">
      <SectionHeader title="Módulos" description={`Módulos activos de ${tenant.name}.`} />
      <div className="premium-card p-5">
        <ComingSoon
          title="Sección en desarrollo"
          description="El estado de módulos activos se conectará al backend en una próxima versión."
        />
      </div>
    </div>
  );
}
