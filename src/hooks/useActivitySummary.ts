/**
 * useActivitySummary — trae solo los totales/contadores de
 * `/api/metrics/activities` (limit=1) para alimentar las KpiCards de la
 * página Actividad sin descargar el listado completo.
 */
import { useEffect, useState } from "react";

const API_BASE = import.meta.env.DEV
  ? "/umeia-api"
  : (import.meta.env.VITE_API_URL ?? "https://umeia.space");

export interface ActivitySummary {
  total:            number | null;
  leadMovedColumn:  number | null;
  botReply:         number | null;
  humanAgentReply:  number | null;
  loading:          boolean;
}

const EMPTY: ActivitySummary = {
  total: null, leadMovedColumn: null, botReply: null, humanAgentReply: null,
  loading: true,
};

interface Resp {
  total: number;
  counts: Record<string, number>;
}

export function useActivitySummary(apiSlug: string | undefined, hours = 24): ActivitySummary {
  const [s, setS] = useState<ActivitySummary>(EMPTY);

  useEffect(() => {
    if (!apiSlug) return;
    let cancelled = false;
    setS({ ...EMPTY });

    const params = new URLSearchParams({
      tenant_id: apiSlug,
      hours: String(hours),
      limit: "1",
    });

    fetch(`${API_BASE}/api/metrics/activities?${params}`)
      .then(res => (res.ok ? res.json() as Promise<Resp> : null))
      .then(data => {
        if (cancelled || !data) return;
        setS({
          total: data.total,
          leadMovedColumn: data.counts?.lead_moved_column ?? 0,
          botReply: data.counts?.bot_reply ?? 0,
          humanAgentReply: data.counts?.human_agent_reply ?? 0,
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
