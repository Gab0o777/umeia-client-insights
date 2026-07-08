import { useEffect, useState } from "react";

const API_BASE = import.meta.env.DEV
  ? "/umeia-api"
  : (import.meta.env.VITE_API_URL ?? "https://umeia.space");

/**
 * Minutos de trabajo humano que ahorra cada conversación atendida de forma
 * automática. Estimación deliberadamente conservadora: leer, responder y
 * dejar registrada la comunicación (~2 min por conversación). Se estima por
 * conversación y no por mensaje: por mensaje el número supera las horas de
 * un mes y deja de ser creíble.
 */
export const MINUTES_PER_AUTO_ACTION = 2;

interface ChatResp {
  total_inbound: number;
  total_conversations: number;
  auto_response_rate: number | null;
}
interface AutomationResp {
  automation_rate: number | null;
}

export interface MonthlySummary {
  /** Mensajes entrantes del período. */
  messages: number | null;
  /** % de automatización del período (0-100). */
  automationPct: number | null;
  /** Horas ahorradas estimadas: conversaciones automatizadas × MINUTES_PER_AUTO_ACTION. */
  savedHours: number | null;
  loading: boolean;
}

/**
 * Métricas del período para el resumen ejecutivo ("Qué hizo UMEIA por vos
 * este mes"). Usa el mismo % de automatización que el resto del panel
 * (Kommo, con fallback al rate de chat). Cada campo queda en null si falta
 * el dato real — nunca estimaciones sin base.
 */
export function useMonthlySummary(apiSlug: string | undefined, hours: number): MonthlySummary {
  const [summary, setSummary] = useState<Omit<MonthlySummary, "loading">>({
    messages: null, automationPct: null, savedHours: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!apiSlug) return;
    let cancelled = false;
    setLoading(true);
    setSummary({ messages: null, automationPct: null, savedHours: null });

    const tid = encodeURIComponent(apiSlug);
    const chatReq = fetch(`${API_BASE}/api/metrics/chat?tenant_id=${tid}&hours=${hours}`)
      .then(res => (res.ok ? (res.json() as Promise<ChatResp>) : null))
      .catch(() => null);
    const autoReq = fetch(`${API_BASE}/api/metrics/automation?tenant_id=${tid}&hours=${hours}`)
      .then(res => (res.ok ? (res.json() as Promise<AutomationResp>) : null))
      .catch(() => null);

    Promise.all([chatReq, autoReq]).then(([chat, auto]) => {
      if (cancelled) return;
      const convos = chat?.total_conversations ?? null;
      const rate = auto?.automation_rate ?? chat?.auto_response_rate ?? null;
      setSummary({
        messages:      chat?.total_inbound ?? null,
        automationPct: rate != null ? Math.round(rate * 100) : null,
        savedHours:    convos != null && rate != null
          ? (convos * rate * MINUTES_PER_AUTO_ACTION) / 60
          : null,
      });
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [apiSlug, hours]);

  return { ...summary, loading };
}

/** "≈ 340 h" / "≈ 7,5 h" — sin decimales cuando el número ya es grande. */
export function formatSavedHours(h: number): string {
  const rounded = h >= 10 ? Math.round(h) : Math.round(h * 10) / 10;
  return `≈ ${rounded.toLocaleString("es-AR")} h`;
}
