/**
 * usePipelineDetail — trae `/api/metrics/pipeline-detail` para UN pipeline
 * (no hay versión "todos" — el orden/nombre de etapas solo tiene sentido
 * dentro de un pipeline). `null` mientras no haya `pipelineId` seleccionado
 * (tab "Todos" en el panel).
 */
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { API_BASE, authHeaders } from "@/lib/apiClient";

export interface PipelineStage {
  status_id: number;
  status_name: string | null;
  /** Leads que entraron a esta etapa dentro de `hours`. */
  period_total: number;
  /** Mismo cálculo para el período anterior equivalente — base del %. */
  prev_period_total: number;
}

export interface PipelineDailyPoint {
  date: string;
  status_id: number;
  total: number;
}

export interface PipelineStaleStage {
  status_id: number;
  status_name: string | null;
  /** Leads sentados en esta etapa hace más de 24h (foto actual, no respeta `hours`). */
  count: number;
}

export interface PipelineMovement {
  at: string;
  lead_id: number;
  from_status_id: number;
  from_status_name: string | null;
  to_status_id: number;
  to_status_name: string | null;
}

export interface PipelineDetail {
  pipelineId: number | null;
  pipelineName: string | null;
  crmSubdomain: string | null;
  stages: PipelineStage[];
  totalMovements: number;
  totalMovementsPrev: number;
  daily: PipelineDailyPoint[];
  stale: PipelineStaleStage[];
  recentMovements: PipelineMovement[];
  loading: boolean;
}

interface Resp {
  pipeline_id: number;
  pipeline_name: string | null;
  crm_subdomain: string | null;
  stages: PipelineStage[];
  total_movements: number;
  total_movements_prev: number;
  daily: PipelineDailyPoint[];
  stale: PipelineStaleStage[];
  recent_movements: PipelineMovement[];
}

const EMPTY: PipelineDetail = {
  pipelineId: null, pipelineName: null, crmSubdomain: null, stages: [],
  totalMovements: 0, totalMovementsPrev: 0, daily: [], stale: [], recentMovements: [],
  loading: false,
};

export function usePipelineDetail(
  apiSlug: string | undefined, pipelineId: number | null, hours = 168
): PipelineDetail {
  const { accessToken, logout } = useAuth();
  const [s, setS] = useState<PipelineDetail>(EMPTY);

  useEffect(() => {
    if (!apiSlug || !accessToken || pipelineId === null) {
      setS(EMPTY);
      return;
    }
    let cancelled = false;
    setS({ ...EMPTY, loading: true });

    const params = new URLSearchParams({ tenant_id: apiSlug, pipeline_id: String(pipelineId), hours: String(hours) });

    fetch(`${API_BASE}/api/metrics/pipeline-detail?${params}`, { headers: authHeaders(accessToken) })
      .then(res => {
        if (res.status === 401) { logout(); return null; }
        return res.ok ? (res.json() as Promise<Resp>) : null;
      })
      .then(data => {
        if (cancelled || !data) return;
        setS({
          pipelineId: data.pipeline_id,
          pipelineName: data.pipeline_name,
          crmSubdomain: data.crm_subdomain,
          stages: data.stages ?? [],
          totalMovements: data.total_movements ?? 0,
          totalMovementsPrev: data.total_movements_prev ?? 0,
          daily: data.daily ?? [],
          stale: data.stale ?? [],
          recentMovements: data.recent_movements ?? [],
          loading: false,
        });
      })
      .catch(() => {
        if (!cancelled) setS(prev => ({ ...prev, loading: false }));
      });

    return () => { cancelled = true; };
  }, [apiSlug, accessToken, pipelineId, hours]);

  return s;
}
