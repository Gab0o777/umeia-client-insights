import { useEffect, useState } from "react";

const API_BASE = import.meta.env.DEV
  ? "/umeia-api"
  : (import.meta.env.VITE_API_URL ?? "https://umeia.space");

export interface CostDay {
  date: string;
  cost_usd: number;
}
export interface CostCategory {
  category: string;
  cost_usd: number;
  conversations?: number;
  messages?: number;
}
export interface CostsResp {
  tenant_id: string;
  hours: number;
  /** true solo si el módulo está activo Y la cuenta de Meta está conectada */
  module_enabled: boolean;
  connected: boolean;
  waba_name?: string | null;
  currency?: string | null;
  source?: "meta";
  /** "per_message" (modelo nuevo) | "per_conversation" (modelo viejo) */
  pricing_model?: "per_message" | "per_conversation";
  total_cost_usd?: number;
  total_conversations?: number;
  total_paid_messages?: number;
  total_free_messages?: number;
  by_day?: CostDay[];
  by_category?: CostCategory[];
  /** "reconnect_required" | "cost_unavailable" | "meta_http_*" | "meta_unreachable" */
  error?: string;
}

/**
 * Meta devuelve el costo en la moneda de facturación del WABA (campo
 * `currency`), no siempre en USD. Prefijo para mostrar montos.
 */
export function costPrefix(currency?: string | null): string {
  if (!currency || currency === "USD") return "US$ ";
  return `${currency} `;
}

/**
 * Costos REALES de WhatsApp (Meta). Solo devuelve números cuando el módulo
 * está activo, la cuenta está conectada y Meta respondió OK — nunca
 * estimaciones.
 */
export function useCosts(apiSlug: string | undefined, hours: number) {
  const [data, setData] = useState<CostsResp | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!apiSlug) return;
    let cancelled = false;
    setLoading(true);

    fetch(`${API_BASE}/api/metrics/costs?tenant_id=${encodeURIComponent(apiSlug)}&hours=${hours}`)
      .then(res => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((json: CostsResp) => { if (!cancelled) setData(json); })
      .catch(() => { if (!cancelled) setData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [apiSlug, hours]);

  return { data, loading };
}
