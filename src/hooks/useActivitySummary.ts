/**
 * useActivitySummary — trae solo los totales/contadores de
 * `/api/metrics/activities` (limit=1) para alimentar las KpiCards de la
 * página Actividad sin descargar el listado completo.
 */
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { API_BASE, authHeaders } from "@/lib/apiClient";

export interface ActivitySummary {
  total:                       number | null;
  leadMovedColumn:             number | null;
  botReply:                    number | null;
  humanAgentReply:             number | null;
  humanAgentReplyConversations: number | null;
  loading:                     boolean;
}

const EMPTY: ActivitySummary = {
  total: null, leadMovedColumn: null, botReply: null, humanAgentReply: null,
  humanAgentReplyConversations: null,
  loading: true,
};

interface Resp {
  total: number;
  counts: Record<string, number>;
  conversation_counts?: Record<string, number>;
}

export function useActivitySummary(apiSlug: string | undefined, hours = 24): ActivitySummary {
  const { accessToken, logout } = useAuth();
  const [s, setS] = useState<ActivitySummary>(EMPTY);

  useEffect(() => {
    if (!apiSlug || !accessToken) return;
    let cancelled = false;
    setS({ ...EMPTY });

    const params = new URLSearchParams({
      tenant_id: apiSlug,
      hours: String(hours),
      limit: "1",
    });

    fetch(`${API_BASE}/api/metrics/activities?${params}`, { headers: authHeaders(accessToken) })
      .then(res => {
        if (res.status === 401) { logout(); return null; }
        return res.ok ? (res.json() as Promise<Resp>) : null;
      })
      .then(data => {
        if (cancelled || !data) return;
        setS({
          total: data.total,
          leadMovedColumn: data.counts?.lead_moved_column ?? 0,
          botReply: data.counts?.bot_reply ?? 0,
          humanAgentReply: data.counts?.human_agent_reply ?? 0,
          humanAgentReplyConversations: data.conversation_counts?.human_agent_reply ?? 0,
          loading: false,
        });
      })
      .catch(() => {
        if (!cancelled) setS(prev => ({ ...prev, loading: false }));
      });

    return () => { cancelled = true; };
  }, [apiSlug, accessToken, hours]);

  return s;
}
