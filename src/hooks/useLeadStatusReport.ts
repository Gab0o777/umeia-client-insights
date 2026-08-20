/**
 * useLeadStatusReport — trae `/api/metrics/lead-status-report`: cuántos leads
 * abiertos hay parados en cada columna del pipeline del CRM, más `leads_won`
 * (leads ganados dentro de `hours`, el único campo de este endpoint que
 * respeta la ventana de tiempo — el resto es una foto siempre actual).
 */
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { API_BASE, authHeaders } from "@/lib/apiClient";

export interface LeadStatusColumn {
  status_id: number;
  pipeline_id: number;
  status_name: string | null;
  total: number;
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

interface LeadStatusReportResp {
  total_open: number;
  range_labels: string[];
  statuses: LeadStatusColumn[];
  pipelines: PipelineInfo[];
  crm: CrmInfo | null;
  leads_won: number;
  human_handoff: { status_ids: number[]; pending_reply: number };
}

export interface LeadStatusReport {
  totalOpen:        number | null;
  columns:          LeadStatusColumn[];
  rangeLabels:      string[];
  pipelines:        PipelineInfo[];
  crm:              CrmInfo | null;
  leadsWon:         number | null;
  pendingReply:     number | null;
  hasHandoff:       boolean;
  handoffStatusIds: number[];
  loading:          boolean;
}

const EMPTY: LeadStatusReport = {
  totalOpen: null, columns: [], rangeLabels: [], pipelines: [], crm: null, leadsWon: null, pendingReply: null,
  hasHandoff: false, handoffStatusIds: [], loading: true,
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
          totalOpen:        data.total_open,
          columns:          data.statuses,
          rangeLabels:      data.range_labels ?? [],
          pipelines:        data.pipelines ?? [],
          crm:              data.crm,
          leadsWon:         data.leads_won ?? null,
          pendingReply:     data.human_handoff?.pending_reply ?? null,
          hasHandoff:       (data.human_handoff?.status_ids?.length ?? 0) > 0,
          handoffStatusIds: data.human_handoff?.status_ids ?? [],
          loading:          false,
        });
      })
      .catch(() => {
        if (!cancelled) setS(prev => ({ ...prev, loading: false }));
      });

    return () => { cancelled = true; };
  }, [apiSlug, accessToken, hours]);

  return s;
}
