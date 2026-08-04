/**
 * useLeadStatusReport — trae `/api/metrics/lead-status-report`: cuántos leads
 * abiertos hay parados en cada columna del pipeline del CRM, más `leads_won`
 * (leads ganados dentro de `hours`, el único campo de este endpoint que
 * respeta la ventana de tiempo — el resto es una foto siempre actual).
 */
import { useEffect, useState } from "react";

const API_BASE = import.meta.env.DEV
  ? "/umeia-api"
  : (import.meta.env.VITE_API_URL ?? "https://umeia.space");

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

interface LeadStatusReportResp {
  total_open: number;
  range_labels: string[];
  statuses: LeadStatusColumn[];
  crm: CrmInfo | null;
  leads_won: number;
  human_handoff: { status_ids: number[]; pending_reply: number };
}

export interface LeadStatusReport {
  totalOpen:        number | null;
  columns:          LeadStatusColumn[];
  rangeLabels:      string[];
  crm:              CrmInfo | null;
  leadsWon:         number | null;
  pendingReply:     number | null;
  hasHandoff:       boolean;
  handoffStatusIds: number[];
  loading:          boolean;
}

const EMPTY: LeadStatusReport = {
  totalOpen: null, columns: [], rangeLabels: [], crm: null, leadsWon: null, pendingReply: null,
  hasHandoff: false, handoffStatusIds: [], loading: true,
};

export function useLeadStatusReport(apiSlug: string | undefined, hours = 720): LeadStatusReport {
  const [s, setS] = useState<LeadStatusReport>(EMPTY);

  useEffect(() => {
    if (!apiSlug) return;
    let cancelled = false;
    setS({ ...EMPTY });

    const params = new URLSearchParams({ tenant_id: apiSlug, hours: String(hours) });

    fetch(`${API_BASE}/api/metrics/lead-status-report?${params}`)
      .then(res => (res.ok ? res.json() as Promise<LeadStatusReportResp> : null))
      .then(data => {
        if (cancelled || !data) return;
        setS({
          totalOpen:        data.total_open,
          columns:          data.statuses,
          rangeLabels:      data.range_labels ?? [],
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
  }, [apiSlug, hours]);

  return s;
}
