/**
 * useLeadStatusReport — trae `/api/metrics/lead-status-report`.
 *
 * `columns[].total` / `totalOpen` son una FOTO ACTUAL (leads abiertos parados
 * ahí ahora mismo) — no respetan `hours`. `leadsWon` y
 * `pipelinesPeriodStats[].leads_active` sí respetan `hours`: son los leads
 * ganados / con cambio de estado dentro de esa ventana. Por eso el snapshot
 * puede no coincidir con lo que muestra el CRM filtrado por fecha — son
 * números distintos por diseño, no un bug.
 */
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { API_BASE, authHeaders } from "@/lib/apiClient";

export interface LeadStatusColumn {
  status_id: number;
  pipeline_id: number;
  status_name: string | null;
  total: number;
  /** Leads that entered this status within `hours` — unlike `total` (a
   * current snapshot), this respects the date filter. */
  period_total: number;
  ranges: Record<string, number>;
  oldest_days: number | null;
}

export interface CrmInfo {
  name: string;
  subdomain: string;
}

export interface PipelineInfo {
  pipeline_id: number;
  pipeline_name: string | null;
}

export interface PipelinePeriodStats {
  pipeline_id: number;
  leads_active: number;
}

/** Estado "base" (opcional, `null` hasta que el tenant lo configure) y
 * estado "final"/outcome (requerido) de un pipeline — ambos configurados
 * explícitamente por tenant, ver `_funnel_stage_candidates` en el backend. */
export interface FunnelStage {
  pipeline_id: number;
  pipeline_name: string | null;
  first_status_id: number | null;
  first_status_name: string | null;
  first_period_total: number | null;
  final_status_id: number;
  final_status_name: string | null;
  final_period_total: number;
}

interface LeadStatusReportResp {
  total_open: number;
  range_labels: string[];
  statuses: LeadStatusColumn[];
  pipelines: PipelineInfo[];
  pipelines_period_stats: PipelinePeriodStats[];
  funnel_stages: FunnelStage[];
  crm: CrmInfo | null;
  leads_won: number;
  human_handoff: { status_ids: number[]; pending_reply: number };
}

export interface LeadStatusReport {
  totalOpen:            number | null;
  columns:              LeadStatusColumn[];
  rangeLabels:          string[];
  pipelines:            PipelineInfo[];
  pipelinesPeriodStats: PipelinePeriodStats[];
  funnelStages:         FunnelStage[];
  crm:                  CrmInfo | null;
  leadsWon:             number | null;
  pendingReply:         number | null;
  hasHandoff:           boolean;
  handoffStatusIds:     number[];
  loading:              boolean;
}

const EMPTY: LeadStatusReport = {
  totalOpen: null, columns: [], rangeLabels: [], pipelines: [], pipelinesPeriodStats: [], funnelStages: [], crm: null,
  leadsWon: null, pendingReply: null, hasHandoff: false, handoffStatusIds: [], loading: true,
};

export function useLeadStatusReport(apiSlug: string | undefined, hours = 720): LeadStatusReport {
  const { accessToken, logout } = useAuth();
  const [s, setS] = useState<LeadStatusReport>(EMPTY);

  useEffect(() => {
    if (!apiSlug || !accessToken) return;
    let cancelled = false;
    setS({ ...EMPTY });

    const params = new URLSearchParams({ tenant_id: apiSlug, hours: String(hours) });

    fetch(`${API_BASE}/api/metrics/lead-status-report?${params}`, { headers: authHeaders(accessToken) })
      .then(res => {
        if (res.status === 401) { logout(); return null; }
        return res.ok ? (res.json() as Promise<LeadStatusReportResp>) : null;
      })
      .then(data => {
        if (cancelled || !data) return;
        setS({
          totalOpen:            data.total_open,
          columns:              data.statuses,
          rangeLabels:          data.range_labels ?? [],
          pipelines:            data.pipelines ?? [],
          pipelinesPeriodStats: data.pipelines_period_stats ?? [],
          funnelStages:         data.funnel_stages ?? [],
          crm:                  data.crm,
          leadsWon:             data.leads_won ?? null,
          pendingReply:         data.human_handoff?.pending_reply ?? null,
          hasHandoff:           (data.human_handoff?.status_ids?.length ?? 0) > 0,
          handoffStatusIds:     data.human_handoff?.status_ids ?? [],
          loading:              false,
        });
      })
      .catch(() => {
        if (!cancelled) setS(prev => ({ ...prev, loading: false }));
      });

    return () => { cancelled = true; };
  }, [apiSlug, accessToken, hours]);

  return s;
}
