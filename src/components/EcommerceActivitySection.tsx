/**
 * EcommerceActivitySection — sección "Actividad de Tienda Nube": solo se
 * renderiza si el tenant tiene Tiendanube conectado (config.connected desde
 * /api/metrics/ecommerce). Si no está conectado, no muestra nada.
 */
import { Package, ShoppingCart, UserPlus, MessageCircle } from "lucide-react";
import { KpiCard } from "@/components/KpiCard";
import { KpiSkeleton } from "@/components/Skeleton";
import { useEcommerceMetrics } from "@/hooks/useEcommerceMetrics";

export function EcommerceActivitySection({ apiSlug, hours }: { apiSlug: string | undefined; hours: number }) {
  const metrics = useEcommerceMetrics(apiSlug, hours);

  if (!metrics.loading && !metrics.connected) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actividad de Tienda Nube</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.loading ? (
          <>
            <KpiSkeleton /><KpiSkeleton /><KpiSkeleton /><KpiSkeleton />
          </>
        ) : (
          <>
            <KpiCard
              label="Consultas de productos"
              value={metrics.productQueries}
              icon={Package}
              accent="info"
              subtitle="Veces que se consultó info de productos"
            />
            <KpiCard
              label="Órdenes recibidas"
              value={metrics.ordersReceived}
              icon={ShoppingCart}
              accent="primary"
              subtitle="Órdenes de Tienda Nube procesadas"
            />
            <KpiCard
              label="Leads creados"
              value={metrics.ordersWithLead}
              icon={UserPlus}
              accent="success"
              subtitle="Órdenes convertidas en lead del CRM"
            />
            <KpiCard
              label="Avisos por WhatsApp"
              value={metrics.ordersNotifiedWhatsapp}
              icon={MessageCircle}
              accent="accent"
              subtitle="Órdenes con seguimiento enviado"
            />
          </>
        )}
      </div>
    </div>
  );
}
