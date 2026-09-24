import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { API_BASE, authHeaders } from "@/lib/apiClient";

// Datos de Google Ads sincronizados server-side por Zernio (ver
// core/scheduler/jobs/zernio_ads_sync.py en umeiacore) y expuestos por
// core/api/zernio_reporting.py. Solo lectura — la sync corre en background.

export interface ZernioTimelineRow {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  ctr: number;
  cpc: number;
  cpm: number;
  conversions: number;
  cost_per_conversion: number;
  purchase_value: number;
  roas: number;
}

export interface ZernioTimelineSummary {
  total_spend: number;
  total_impressions: number;
  total_clicks: number;
  total_conversions: number;
  total_purchase_value: number;
  avg_ctr: number;
  avg_cpc: number;
  avg_cpm: number;
  roas: number;
  days: number;
}

export interface ZernioTimelineResp {
  tenant_id: string;
  from_date: string;
  to_date: string;
  rows: ZernioTimelineRow[];
  summary: ZernioTimelineSummary | null;
}

export interface ZernioCampaign {
  platform_campaign_id: string;
  name: string;
  status: string;
  objective: string | null;
  platform: string;
  budget_type: string | null;
  budget_amount: number | null;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  cost_per_conversion: number;
  ctr: number;
  cpc: number;
  roas: number;
  synced_at: string | null;
}

export interface ZernioAd {
  platform_ad_id: string;
  ad_name: string;
  ad_set_name: string;
  campaign_name: string;
  platform_campaign_id: string;
  status: string;
  platform: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  cost_per_conversion: number;
  ctr: number;
  cpc: number;
  roas: number;
  synced_at: string | null;
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export function useZernioTimeline(apiSlug: string | undefined, days: number) {
  const { accessToken, logout } = useAuth();
  const [data, setData] = useState<ZernioTimelineResp | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!apiSlug || !accessToken) return;
    let cancelled = false;
    setLoading(true);

    const params = new URLSearchParams({
      tenant_id: apiSlug,
      from_date: isoDaysAgo(days),
      to_date: isoDaysAgo(0),
    });

    fetch(`${API_BASE}/api/reporting/zernio/timeline?${params}`, { headers: authHeaders(accessToken) })
      .then(res => {
        if (res.status === 401) { logout(); return Promise.reject(401); }
        return res.ok ? res.json() : Promise.reject(res.status);
      })
      .then((json: ZernioTimelineResp) => { if (!cancelled) setData(json); })
      .catch(() => { if (!cancelled) setData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [apiSlug, accessToken, days]);

  return { data, loading };
}

export function useZernioCampaigns(apiSlug: string | undefined) {
  const { accessToken, logout } = useAuth();
  const [campaigns, setCampaigns] = useState<ZernioCampaign[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!apiSlug || !accessToken) return;
    let cancelled = false;
    setLoading(true);

    fetch(`${API_BASE}/api/reporting/zernio/campaigns?tenant_id=${encodeURIComponent(apiSlug)}`, { headers: authHeaders(accessToken) })
      .then(res => {
        if (res.status === 401) { logout(); return Promise.reject(401); }
        return res.ok ? res.json() : Promise.reject(res.status);
      })
      .then((json: { campaigns: ZernioCampaign[] }) => { if (!cancelled) setCampaigns(json.campaigns); })
      .catch(() => { if (!cancelled) setCampaigns(null); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [apiSlug, accessToken]);

  return { campaigns, loading };
}

export function useZernioAds(apiSlug: string | undefined, campaignId: string | null) {
  const { accessToken, logout } = useAuth();
  const [ads, setAds] = useState<ZernioAd[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!apiSlug || !accessToken || !campaignId) { setAds(null); return; }
    let cancelled = false;
    setLoading(true);

    const params = new URLSearchParams({ tenant_id: apiSlug, campaign_id: campaignId });

    fetch(`${API_BASE}/api/reporting/zernio/ads?${params}`, { headers: authHeaders(accessToken) })
      .then(res => {
        if (res.status === 401) { logout(); return Promise.reject(401); }
        return res.ok ? res.json() : Promise.reject(res.status);
      })
      .then((json: { ads: ZernioAd[] }) => { if (!cancelled) setAds(json.ads); })
      .catch(() => { if (!cancelled) setAds(null); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [apiSlug, accessToken, campaignId]);

  return { ads, loading };
}
