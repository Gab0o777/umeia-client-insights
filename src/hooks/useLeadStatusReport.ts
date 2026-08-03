/**
 * useLeadStatusReport — trae `/api/metrics/lead-status-report`: cuántos leads
 * abiertos hay parados en cada columna del pipeline del CRM.
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
  oldest_days: number | null;
}

export interface CrmInfo {
  name: string;
  subdomain: string;
}

interface LeadStatusReportResp {
  total_open: number;
  statuses: LeadStatusColumn[];
  crm: CrmInfo | null;
  human_handoff: { status_ids: number[]; pending_reply: number };
}

export interface LeadStatusReport {
  totalOpen:    number | null;
  columns:      LeadStatusColumn[];
  crm:          CrmInfo | null;
  pendingReply: number | null;
  hasHandoff:   boolean;
  loading:      boolean;
}

const EMPTY: LeadStatusReport = {
  totalOpen: null, columns: [], crm: null, pendingReply: null, hasHandoff: false, loading: true,
};

export function useLeadStatusReport(apiSlug: string | undefined): LeadStatusReport {
  const [s, setS] = useState<LeadStatusReport>(EMPTY);

  useEffect(() => {
    if (!apiSlug) return;
    let cancelled = false;
    setS({ ...EMPTY });

    const params = new URLSearchParams({ tenant_id: apiSlug });

    fetch(`${API_BASE}/api/metrics/lead-status-report?${params}`)
      .then(res => (res.ok ? res.json() as Promise<LeadStatusReportResp> : null))
      .then(data => {
        if (cancelled || !data) return;
        setS({
          totalOpen:    data.total_open,
          columns:      data.statuses,
          crm:          data.crm,
          pendingReply: data.human_handoff?.pending_reply ?? null,
          hasHandoff:   (data.human_handoff?.status_ids?.length ?? 0) > 0,
          loading:      false,
        });
      })
      .catch(() => {
        if (!cancelled) setS(prev => ({ ...prev, loading: false }));
      });

    return () => { cancelled = true; };
  }, [apiSlug]);

  return s;
}
