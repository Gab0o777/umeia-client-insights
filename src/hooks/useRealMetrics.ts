/**
 * useRealMetrics — datos reales desde https://umeia.space
 *
 * Estrategia de dos velocidades:
 *  - KPIs  (chat, webhooks, kommo, messages_by_day): se piden siempre, 
 *    reflejan la ventana de tiempo seleccionada por el usuario.
 *  - Charts (by_channel, by_hour, by_intent): se piden en un solo request
 *    combinado (/metrics/chat/charts) para minimizar round-trips.
 *    Tienen cache de 5 min en el backend.
 *
 * ─── CORS en producción ───────────────────────────────────────────────
 * El backend debe incluir:
 *   Access-Control-Allow-Origin: https://client-insights.umeia.io
 * ─────────────────────────────────────────────────────────────────────
 */

import { useEffect, useState } from "react";

const API_BASE = import.meta.env.DEV
  ? "/umeia-api"
  : (import.meta.env.VITE_API_URL ?? "https://umeia.space");

export interface DayPoint     { day: string; auto: number; human: number; }
export interface IntentPoint  { intent: string; value: number; }
export interface ChannelPoint { name: string; value: number; }
export interface HourPoint    { hour: string; value: number; }

export interface RealMetrics {
  messages: number | null;
  activeConvos: number | null;
  automation: number | null;
  human: number | null;
  leads: number | null;
  messagesByDay: DayPoint[];
  byIntent: IntentPoint[];
  byChannel: ChannelPoint[];
  byHour: HourPoint[];
  loading: boolean;         // true mientras cargan los KPIs (bloquea KPI cards)
  chartsLoading: boolean;   // true mientras carga el endpoint combinado de charts
  error: boolean;
  corsBlocked: boolean;
}

async function fetchJson<T>(url: string): Promise<{ data: T | null; corsBlocked: boolean }> {
  try {
    const res = await fetch(url);
    if (!res.ok) return { data: null, corsBlocked: false };
    return { data: (await res.json()) as T, corsBlocked: false };
  } catch {
    const isCors = !import.meta.env.DEV && API_BASE.startsWith("http");
    if (isCors) {
      console.warn(
        `[useRealMetrics] Sin acceso a ${new URL(url).pathname} — ` +
        `el backend necesita: Access-Control-Allow-Origin: ${window.location.origin}`
      );
    }
    return { data: null, corsBlocked: isCors };
  }
}

interface ChatMetrics   { total_conversations: number; total_inbound: number; auto_response_rate: number | null; by_intent: Record<string, number>; }
interface WebhookTenant { total: number | null; }
interface KommoResponse { tenants: { tenant_id: string; leads_count: number | null }[] }
interface DayResp       { days: DayPoint[]; }
interface ChartsResp    { by_channel: ChannelPoint[]; by_hour: HourPoint[]; by_intent: IntentPoint[]; }

const EMPTY: RealMetrics = {
  messages: null, activeConvos: null, automation: null, human: null, leads: null,
  messagesByDay: [], byIntent: [], byChannel: [], byHour: [],
  loading: true, chartsLoading: true, error: false, corsBlocked: false,
};

export function useRealMetrics(apiSlug: string | undefined, hours = 720): RealMetrics {
  const [metrics, setMetrics] = useState<RealMetrics>(EMPTY);

  useEffect(() => {
    if (!apiSlug) return;
    let cancelled = false;

    const tid = encodeURIComponent(apiSlug);
    const h   = encodeURIComponent(hours);

    // ── Request 1: KPIs (ventana dinámica según hours) ─────────────────
    async function loadKpis() {
      const [chatR, webhooksR, kommoR, byDayR] = await Promise.all([
        fetchJson<ChatMetrics>(`${API_BASE}/api/metrics/chat?tenant_id=${tid}&hours=${h}`),
        fetchJson<WebhookTenant>(`${API_BASE}/api/metrics/webhooks_by_tenant?tenant_id=${tid}&hours=24`),
        fetchJson<KommoResponse>(`${API_BASE}/api/metrics/kommo_leads`),
        fetchJson<DayResp>(`${API_BASE}/api/metrics/messages_by_day?tenant_id=${tid}&days=14`),
      ]);
      if (cancelled) return;

      const chat     = chatR.data;
      const webhooks = webhooksR.data;
      const kommo    = kommoR.data;
      const byDay    = byDayR.data;
      const corsBlocked = [chatR, webhooksR, kommoR, byDayR].every(r => r.corsBlocked);
      const autoRate = chat?.auto_response_rate ?? null;
      const tenantLead = kommo?.tenants?.find(k => k.tenant_id === apiSlug);

      setMetrics(m => ({
        ...m,
        messages:     chat?.total_inbound ?? webhooks?.total ?? null,
        activeConvos: chat?.total_conversations ?? null,
        automation:   autoRate !== null ? Math.round(autoRate * 100) : null,
        human:        autoRate !== null ? Math.round((1 - autoRate) * 100) : null,
        leads:        tenantLead?.leads_count ?? null,
        messagesByDay: byDay?.days ?? [],
        loading:      false,
        error:        !chat && !webhooks && !corsBlocked,
        corsBlocked,
      }));
    }

    // ── Request 2: Charts combinado (endpoint con cache 5 min) ─────────
    // Usa siempre hours=720 (30d) para aprovechar el cache del backend.
    // El usuario ve data de todo el mes en los gráficos de distribución,
    // que es lo más útil independientemente del rango de KPIs seleccionado.
    async function loadCharts() {
      const r = await fetchJson<ChartsResp>(
        `${API_BASE}/api/metrics/chat/charts?tenant_id=${tid}&hours=720`
      );
      if (cancelled) return;

      if (r.data) {
        setMetrics(m => ({
          ...m,
          byChannel:     r.data!.by_channel,
          byHour:        r.data!.by_hour,
          byIntent:      r.data!.by_intent,
          chartsLoading: false,
        }));
      } else {
        setMetrics(m => ({ ...m, chartsLoading: false }));
      }
    }

    // Lanzar ambos en paralelo pero de forma independiente
    setMetrics({ ...EMPTY });
    loadKpis();
    loadCharts();

    return () => { cancelled = true; };
  }, [apiSlug, hours]);

  return metrics;
}
