/**
 * useActivityOverview — Actividad v2: trae `/api/metrics/activities` con
 * `compare_previous=true` para poder mostrar la variación vs. el período
 * anterior equivalente ("+12% más actividad que la semana anterior"). No
 * reemplaza a `useActivitySummary` (que sigue alimentando la v1 tal cual) —
 * hook aparte para no tocar ese archivo compartido con la vista actual.
 */
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { API_BASE, authHeaders } from "@/lib/apiClient";

export interface ActivityCounts {
  lead_moved_column: number;
  bot_reply: number;
  human_agent_reply: number;
}

export interface ActivityOverview {
  total: number | null;
  counts: ActivityCounts;
  conversationCounts: ActivityCounts;
  previousTotal: number | null;
  loading: boolean;
}

const EMPTY_COUNTS: ActivityCounts = { lead_moved_column: 0, bot_reply: 0, human_agent_reply: 0 };

const EMPTY: ActivityOverview = {
  total: null,
  counts: EMPTY_COUNTS,
  conversationCounts: EMPTY_COUNTS,
  previousTotal: null,
  loading: true,
};

interface Resp {
  total: number;
  counts?: ActivityCounts;
  conversation_counts?: ActivityCounts;
  previous?: { total: number; counts: ActivityCounts };
}

export function useActivityOverview(apiSlug: string | undefined, hours = 168): ActivityOverview {
  const { accessToken, logout } = useAuth();
  const [s, setS] = useState<ActivityOverview>(EMPTY);

  useEffect(() => {
    if (!apiSlug || !accessToken) return;
    let cancelled = false;
    setS({ ...EMPTY });

    const params = new URLSearchParams({
      tenant_id: apiSlug,
      hours: String(hours),
      limit: "1",
      compare_previous: "true",
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
          counts: data.counts ?? EMPTY_COUNTS,
          conversationCounts: data.conversation_counts ?? EMPTY_COUNTS,
          previousTotal: data.previous?.total ?? null,
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
