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
  total_conversations: number;
  auto_response_rate: number | null;
}
interface AutomationResp {
  automation_rate: number | null;
}

/**
 * Horas ahorradas estimadas en el período: conversaciones atendidas
 * automáticamente × MINUTES_PER_AUTO_ACTION. Usa el mismo % de
 * automatización que el resto del panel (Kommo, con fallback al rate de
 * chat). Devuelve null si falta alguno de los dos datos reales.
 */
export function useSavedHours(apiSlug: string | undefined, hours: number) {
  const [savedHours, setSavedHours] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!apiSlug) return;
    let cancelled = false;
    setLoading(true);
    setSavedHours(null);

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
      if (convos != null && rate != null) {
        setSavedHours((convos * rate * MINUTES_PER_AUTO_ACTION) / 60);
      }
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [apiSlug, hours]);

  return { savedHours, loading };
}

/** "≈ 340 h" / "≈ 7,5 h" — sin decimales cuando el número ya es grande. */
export function formatSavedHours(h: number): string {
  const rounded = h >= 10 ? Math.round(h) : Math.round(h * 10) / 10;
  return `≈ ${rounded.toLocaleString("es-AR")} h`;
}
