/**
 * useRealMetrics — datos reales desde https://umeia.space
 *
 * Recibe el apiSlug del tenant para construir las URLs de la API.
 *
 * ─── CORS en producción ───────────────────────────────────────────────
 * En dev, Vite proxea /umeia-api → umeia.space (ver vite.config.ts).
 * En producción (client-insights.umeia.io), el backend DEBE incluir:
 *
 *   Access-Control-Allow-Origin: https://client-insights.umeia.io
 *
 * En FastAPI:
 *   from fastapi.middleware.cors import CORSMiddleware
 *   app.add_middleware(CORSMiddleware,
 *     allow_origins=["https://client-insights.umeia.io"],
 *     allow_methods=["GET"], allow_headers=["*"])
 *
 * En Nginx:
 *   add_header Access-Control-Allow-Origin "https://client-insights.umeia.io";
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
  loading: boolean;
  error: boolean;
  corsBlocked: boolean; // true cuando el error es específicamente CORS
}

async function fetchJson<T>(url: string): Promise<{ data: T | null; corsBlocked: boolean }> {
  try {
    const res = await fetch(url);
    if (!res.ok) return { data: null, corsBlocked: false };
    return { data: (await res.json()) as T, corsBlocked: false };
  } catch (err) {
    // Los errores CORS llegan como TypeError con "Failed to fetch".
    // No podemos distinguirlos de otros errores de red en el catch,
    // pero si API_BASE es un dominio externo en producción asumimos CORS.
    const isCors = !import.meta.env.DEV && API_BASE.startsWith("http");
    if (isCors) {
      // Log limpio en lugar del error de browser rojo
      console.warn(`[useRealMetrics] Sin acceso a ${new URL(url).pathname} — ` +
        `el backend necesita: Access-Control-Allow-Origin: ${window.location.origin}`);
    }
    return { data: null, corsBlocked: isCors };
  }
}

interface ChatMetrics       { total_conversations: number; total_inbound: number; auto_response_rate: number | null; by_intent: Record<string, number>; }
interface WebhookTenant     { total: number | null; }
interface KommoResponse     { tenants: { tenant_id: string; leads_count: number | null }[] }
interface MessagesByDayResp { days: DayPoint[]; }
interface ByChannelResp     { by_channel: ChannelPoint[]; }
interface ByHourResp        { by_hour: HourPoint[]; }

const EMPTY: RealMetrics = {
  messages: null, activeConvos: null, automation: null, human: null, leads: null,
  messagesByDay: [], byIntent: [], byChannel: [], byHour: [],
  loading: true, error: false, corsBlocked: false,
};

export function useRealMetrics(apiSlug: string | undefined, hours = 720): RealMetrics {
  const [metrics, setMetrics] = useState<RealMetrics>(EMPTY);

  useEffect(() => {
    if (!apiSlug) return;
    let cancelled = false;

    async function load() {
      setMetrics(m => ({ ...m, loading: true, error: false, corsBlocked: false }));

      const tid = encodeURIComponent(apiSlug!);
      const h   = encodeURIComponent(hours);

      const [chatR, webhooksR, kommoR, byDayR, byChannelR, byHourR] = await Promise.all([
        fetchJson<ChatMetrics>(`${API_BASE}/api/metrics/chat?tenant_id=${tid}&hours=${h}`),
        fetchJson<WebhookTenant>(`${API_BASE}/api/metrics/webhooks_by_tenant?tenant_id=${tid}&hours=24`),
        fetchJson<KommoResponse>(`${API_BASE}/api/metrics/kommo_leads`),
        fetchJson<MessagesByDayResp>(`${API_BASE}/api/metrics/messages_by_day?tenant_id=${tid}&days=14`),
        fetchJson<ByChannelResp>(`${API_BASE}/api/metrics/chat/by_channel?tenant_id=${tid}&hours=${h}`),
        fetchJson<ByHourResp>(`${API_BASE}/api/metrics/chat/by_hour?tenant_id=${tid}&hours=${h}`),
      ]);

      if (cancelled) return;

      const chat     = chatR.data;
      const webhooks = webhooksR.data;
      const kommo    = kommoR.data;
      const byDay    = byDayR.data;
      const byChannel = byChannelR.data;
      const byHour   = byHourR.data;

      // Si todos los requests fallaron por CORS, lo marcamos explícitamente
      const corsBlocked = [chatR, webhooksR, kommoR, byDayR, byChannelR, byHourR]
        .every(r => r.corsBlocked);

      const autoRate = chat?.auto_response_rate ?? null;
      const messages = chat?.total_inbound ?? webhooks?.total ?? null;
      const tenantLead = kommo?.tenants?.find(k => k.tenant_id === apiSlug);

      const byIntent: IntentPoint[] = chat?.by_intent
        ? Object.entries(chat.by_intent)
            .filter(([k]) => k !== "unknown")
            .map(([intent, value]) => ({ intent, value }))
            .sort((a, b) => b.value - a.value)
        : [];

      setMetrics({
        messages,
        activeConvos:  chat?.total_conversations ?? null,
        automation:    autoRate !== null ? Math.round(autoRate * 100) : null,
        human:         autoRate !== null ? Math.round((1 - autoRate) * 100) : null,
        leads:         tenantLead?.leads_count ?? null,
        messagesByDay: byDay?.days ?? [],
        byIntent,
        byChannel:     byChannel?.by_channel ?? [],
        byHour:        byHour?.by_hour ?? [],
        loading: false,
        error: !chat && !webhooks && !corsBlocked,
        corsBlocked,
      });
    }

    load();
    return () => { cancelled = true; };
  }, [apiSlug, hours]);

  return metrics;
}
