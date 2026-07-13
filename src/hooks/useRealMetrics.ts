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
interface AutomationResp { automation_rate: number | null; source?: string; total?: number; human?: number; }
interface KommoResp   { tenants: { tenant_id: string; leads_count: number | null }[] }
interface DayResp     { days: DayPoint[]; }
interface ChartsResp  { by_channel: ChannelPoint[]; by_hour: HourPoint[]; by_intent: IntentPoint[]; }

export function useRealMetrics(apiSlug: string | undefined, hours = 720, days = 14): RealMetrics {
  const [m, setM] = useState<RealMetrics>(EMPTY);

  useEffect(() => {
    if (!apiSlug) return;
    let cancelled = false;

    // Reset al cambiar tenant/hours/days
    setM({ ...EMPTY });

    const tid = encodeURIComponent(apiSlug);
    const h   = encodeURIComponent(hours);
    const d   = encodeURIComponent(days);

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

    // ── 1a. Chat KPIs (mensajes + convos) ──────────────────────────────
    const chatPromise = get<ChatResp>(`${API_BASE}/api/metrics/chat?tenant_id=${tid}&hours=${h}`)
      .then(chat => {
        patch({
          messages:        chat?.total_inbound ?? null,
          messagesLoading: false,
          activeConvos:    chat?.total_conversations ?? null,
          convosLoading:   false,
        });
        return chat;
      });

    // ── 1b. Automatización — fuente de verdad: Kommo ───────────────────
    // /api/metrics/automation calcula (1 - leads que pasaron por columnas
    // de atención humana / total de leads), cubriendo también el tráfico
    // que el Salesbot de Kommo atiende sin pasar por la API.
    // Si el tenant no lo tiene configurado, cae al rate basado en chat.
    get<AutomationResp>(`${API_BASE}/api/metrics/automation?tenant_id=${tid}&hours=${h}`)
      .then(async auto => {
        let rate = auto?.automation_rate ?? null;
        if (rate === null) {
          const chat = await chatPromise;
          rate = chat?.auto_response_rate ?? null;
        }
        patch({
          automation:        rate !== null ? Math.round(rate * 100)       : null,
          human:             rate !== null ? Math.round((1 - rate) * 100) : null,
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

    // ── 3. Mensajes por día — respeta la cantidad de días del filtro ───
    get<DayResp>(`${API_BASE}/api/metrics/messages_by_day?tenant_id=${tid}&days=${d}`)
      .then(data => {
        patch({
          messagesByDay:        data?.days ?? [],
          messagesByDayLoading: false,
        });
      });

    // ── 4. Charts combinado (por canal + hora + intención) ────────────
    // Respeta el rango de tiempo seleccionado y envía el offset horario
    // del navegador para que "Por horario" se agrupe en hora local.
    const tzOffset = -new Date().getTimezoneOffset(); // minutos al este de UTC (UY = -180)
    get<ChartsResp>(`${API_BASE}/api/metrics/chat/charts?tenant_id=${tid}&hours=${h}&tz_offset_minutes=${tzOffset}`)
      .then(data => {
        patch({
          byChannel:     data?.by_channel ?? [],
          byHour:        data?.by_hour    ?? [],
          byIntent:      data?.by_intent  ?? [],
          chartsLoading: false,
        });
      });

    return () => { cancelled = true; };
  }, [apiSlug, hours, days]);

  return m;
}
