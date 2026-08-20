import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { API_BASE, authHeaders } from "@/lib/apiClient";

export interface AdsCostDay {
  date: string;
  spend_usd: number;
}
export interface AdsCostPlatform {
  platform: string;
  spend_usd: number;
}
export interface AdsCostsResp {
  tenant_id: string;
  hours: number;
  /** true solo si el módulo "costos_ads" está activo para el tenant */
  module_enabled: boolean;
  /** informativo — hay credenciales de Meta Ads cargadas (no bloquea el módulo) */
  connected: boolean;
  /** Moneda de la cuenta de Meta Ads (ej. "ARS", "USD") — el monto ya viene en esta moneda. */
  currency?: string | null;
  total_spend_usd?: number;
  by_day?: AdsCostDay[];
  by_platform?: AdsCostPlatform[];
}

/**
 * Inversión publicitaria (ads) ya sincronizada en la base por el job de
 * paid media — este hook solo lee y filtra por tiempo, no dispara ninguna
 * llamada a Meta/Google en vivo. Solo devuelve números cuando el módulo
 * "costos_ads" está activo para el tenant.
 */
export function useAdsCosts(apiSlug: string | undefined, hours: number) {
  const { accessToken, logout } = useAuth();
  const [data, setData] = useState<AdsCostsResp | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!apiSlug || !accessToken) return;
    let cancelled = false;
    setLoading(true);

    fetch(`${API_BASE}/api/metrics/ads_costs?tenant_id=${encodeURIComponent(apiSlug)}&hours=${hours}`, { headers: authHeaders(accessToken) })
      .then(res => {
        if (res.status === 401) { logout(); return Promise.reject(401); }
        return res.ok ? res.json() : Promise.reject(res.status);
      })
      .then((json: AdsCostsResp) => { if (!cancelled) setData(json); })
      .catch(() => { if (!cancelled) setData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [apiSlug, accessToken, hours]);

  return { data, loading };
}
