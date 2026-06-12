/**
 * useRealMetrics — datos reales desde https://umeia.space
 *
 * Recibe el apiSlug del tenant (campo directo en tenants.ts) para evitar
 * el round-trip de resolución via /api/metrics/tenants.
 *
 * Endpoints consumidos (todos en paralelo):
 *  1. /api/metrics/chat?tenant_id=X&hours=720       → KPIs + by_intent
 *  2. /api/metrics/webhooks_by_tenant?tenant_id=X   → mensajes 24h
 *  3. /api/metrics/kommo_leads                      → leads por tenant
 *  4. /api/metrics/messages_by_day?tenant_id=X      → gráfico diario
 *  5. /api/metrics/chat/by_channel?tenant_id=X      → distribución canal
 *  6. /api/metrics/chat/by_hour?tenant_id=X         → distribución hora
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
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
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
  loading: true, error: false,
};

export function useRealMetrics(apiSlug: string | undefined, hours = 720): RealMetrics {
  const [metrics, setMetrics] = useState<RealMetrics>(EMPTY);

  useEffect(() => {
    if (!apiSlug) return;
    let cancelled = false;

    async function load() {
      setMetrics(m => ({ ...m, loading: true, error: false }));

      const tid = encodeURIComponent(apiSlug);
      const h = encodeURIComponent(hours);

      // Todos los fetches en paralelo — sin round-trip previo de resolución
      const [chat, webhooks, kommo, byDay, byChannel, byHour] = await Promise.all([
        fetchJson<ChatMetrics>(`${API_BASE}/api/metrics/chat?tenant_id=${tid}&hours=${h}`),
        fetchJson<WebhookTenant>(`${API_BASE}/api/metrics/webhooks_by_tenant?tenant_id=${tid}&hours=24`),
        fetchJson<KommoResponse>(`${API_BASE}/api/metrics/kommo_leads`),
        fetchJson<MessagesByDayResp>(`${API_BASE}/api/metrics/messages_by_day?tenant_id=${tid}&days=14`),
        fetchJson<ByChannelResp>(`${API_BASE}/api/metrics/chat/by_channel?tenant_id=${tid}&hours=${h}`),
        fetchJson<ByHourResp>(`${API_BASE}/api/metrics/chat/by_hour?tenant_id=${tid}&hours=${h}`),
      ]);

      if (cancelled) return;

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
        error: !chat && !webhooks,
      });
    }

    load();
    return () => { cancelled = true; };
  }, [apiSlug, hours]);

  return metrics;
}
