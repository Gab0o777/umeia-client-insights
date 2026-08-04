/**
 * useEcommerceMetrics — trae `/api/metrics/ecommerce`: actividad de Tienda
 * Nube (consultas de productos, órdenes recibidas). `connected: false`
 * cuando el tenant no tiene Tiendanube integrado, para que la sección se
 * pueda ocultar en vez de mostrar tarjetas vacías.
 */
import { useEffect, useState } from "react";

const API_BASE = import.meta.env.DEV
  ? "/umeia-api"
  : (import.meta.env.VITE_API_URL ?? "https://umeia.space");

export interface EcommerceMetrics {
  connected:              boolean;
  productQueries:         number | null;
  ordersReceived:         number | null;
  ordersWithLead:         number | null;
  ordersNotifiedWhatsapp: number | null;
  loading:                boolean;
}

const EMPTY: EcommerceMetrics = {
  connected: false, productQueries: null, ordersReceived: null,
  ordersWithLead: null, ordersNotifiedWhatsapp: null, loading: true,
};

interface Resp {
  connected: boolean;
  product_queries?: number;
  orders_received?: number;
  orders_with_lead?: number;
  orders_notified_whatsapp?: number;
}

export function useEcommerceMetrics(apiSlug: string | undefined, hours = 24): EcommerceMetrics {
  const [s, setS] = useState<EcommerceMetrics>(EMPTY);

  useEffect(() => {
    if (!apiSlug) return;
    let cancelled = false;
    setS({ ...EMPTY });

    const params = new URLSearchParams({ tenant_id: apiSlug, hours: String(hours) });

    fetch(`${API_BASE}/api/metrics/ecommerce?${params}`)
      .then(res => (res.ok ? res.json() as Promise<Resp> : null))
      .then(data => {
        if (cancelled) return;
        if (!data) {
          setS({ ...EMPTY, loading: false });
          return;
        }
        setS({
          connected: data.connected,
          productQueries: data.product_queries ?? null,
          ordersReceived: data.orders_received ?? null,
          ordersWithLead: data.orders_with_lead ?? null,
          ordersNotifiedWhatsapp: data.orders_notified_whatsapp ?? null,
          loading: false,
        });
      })
      .catch(() => {
        if (!cancelled) setS(prev => ({ ...prev, loading: false }));
      });

    return () => { cancelled = true; };
  }, [apiSlug, hours]);

  return s;
}
