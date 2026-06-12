/**
 * useRealMetrics — cada métrica se resuelve y renderiza de forma independiente.
 *
 * Cada fetch actualiza el estado en cuanto termina, sin esperar a los demás.
 * Si kommo_leads tarda 8s, los KPIs de chat ya aparecen en 300ms.
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
  // Cada campo tiene su propio estado de carga
  messages:      number | null;
  messagesLoading:      boolean;

  activeConvos:  number | null;
  convosLoading:        boolean;

  automation:    number | null;
  human:         number | null;
  automationLoading:    boolean;

  leads:         number | null;
  leadsLoading:         boolean;

  messagesByDay: DayPoint[];
  messagesByDayLoading: boolean;

  byChannel:     ChannelPoint[];
  byHour:        HourPoint[];
  byIntent:      IntentPoint[];
  chartsLoading:        boolean;

  // Atajos para compatibilidad — true solo si TODO sigue cargando
  loading:       boolean;
  error:         boolean;
}

const EMPTY: RealMetrics = {
  messages: null,      messagesLoading:      true,
  activeConvos: null,  convosLoading:        true,
  automation: null,
  human: null,         automationLoading:    true,
  leads: null,         leadsLoading:         true,
  messagesByDay: [],   messagesByDayLoading: true,
  byChannel: [],
  byHour: [],
  byIntent: [],        chartsLoading:        true,
  loading: true,
  error: false,
};

async function get<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (err) {
    const isCors = !import.meta.env.DEV && API_BASE.startsWith("http");
    if (isCors) {
      console.warn(
        `[metrics] Sin acceso a ${new URL(url).pathname} — ` +
        `el backend necesita: Access-Control-Allow-Origin: ${window.location.origin}`
      );
    }
    return null;
  }
}

interface ChatResp    { total_conversations: number; total_inbound: number; auto_response_rate: number | null; by_intent: Record<string, number>; }
interface WebhookResp { total: number | null; }
interface KommoResp   { tenants: { tenant_id: string; leads_count: number | null }[] }
interface DayResp     { days: DayPoint[]; }
interface ChartsResp  { by_channel: ChannelPoint[]; by_hour: HourPoint[]; by_intent: IntentPoint[]; }

export function useRealMetrics(apiSlug: string | undefined, hours = 720): RealMetrics {
  const [m, setM] = useState<RealMetrics>(EMPTY);

  useEffect(() => {
    if (!apiSlug) return;
    let cancelled = false;

    // Reset al cambiar tenant/hours
    setM({ ...EMPTY });

    const tid = encodeURIComponent(apiSlug);
    const h   = encodeURIComponent(hours);

    // Helper: patch parcial del estado sin pisar otros campos
    const patch = (update: Partial<RealMetrics>) => {
      if (cancelled) return;
      setM(prev => {
        const next = { ...prev, ...update };
        // Recalcular loading global
        next.loading = next.messagesLoading || next.convosLoading ||
          next.automationLoading || next.leadsLoading ||
          next.messagesByDayLoading || next.chartsLoading;
        return next;
      });
    };

    // ── 1. Chat KPIs (mensajes + automation + convos) ─────────────────
    // Un solo fetch cubre tres métricas — las tres se marcan done juntas
    get<ChatResp>(`${API_BASE}/api/metrics/chat?tenant_id=${tid}&hours=${h}`)
      .then(chat => {
        const autoRate = chat?.auto_response_rate ?? null;
        patch({
          messages:          chat?.total_inbound ?? null,
          messagesLoading:   false,
          activeConvos:      chat?.total_conversations ?? null,
          convosLoading:     false,
          automation:        autoRate !== null ? Math.round(autoRate * 100)        : null,
          human:             autoRate !== null ? Math.round((1 - autoRate) * 100)  : null,
          automationLoading: false,
        });
      });

    // ── 2. Leads (Kommo) — puede ser lento, no bloquea a nadie ────────
    get<KommoResp>(`${API_BASE}/api/metrics/kommo_leads`)
      .then(kommo => {
        const entry = kommo?.tenants?.find(k => k.tenant_id === apiSlug);
        patch({
          leads:        entry?.leads_count ?? null,
          leadsLoading: false,
        });
      });

    // ── 3. Mensajes por día ────────────────────────────────────────────
    get<DayResp>(`${API_BASE}/api/metrics/messages_by_day?tenant_id=${tid}&days=14`)
      .then(data => {
        patch({
          messagesByDay:        data?.days ?? [],
          messagesByDayLoading: false,
        });
      });

    // ── 4. Charts combinado (por canal + hora + intención) ────────────
    get<ChartsResp>(`${API_BASE}/api/metrics/chat/charts?tenant_id=${tid}&hours=720`)
      .then(data => {
        patch({
          byChannel:     data?.by_channel ?? [],
          byHour:        data?.by_hour    ?? [],
          byIntent:      data?.by_intent  ?? [],
          chartsLoading: false,
        });
      });

    return () => { cancelled = true; };
  }, [apiSlug, hours]);

  return m;
}
