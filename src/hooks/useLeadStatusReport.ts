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

interface LeadStatusReportResp {
  total_open: number;
  statuses: LeadStatusColumn[];
}

export interface LeadStatusReport {
  totalOpen: number | null;
  columns:   LeadStatusColumn[];
  loading:   boolean;
}

const EMPTY: LeadStatusReport = { totalOpen: null, columns: [], loading: true };

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
          totalOpen: data.total_open,
          columns: data.statuses,
          loading: false,
        });
      })
      .catch(() => {
        if (!cancelled) setS(prev => ({ ...prev, loading: false }));
      });

    return () => { cancelled = true; };
  }, [apiSlug]);

  return s;
}
