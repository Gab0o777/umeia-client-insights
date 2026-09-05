/**
 * useMenuReport — trae `/api/metrics/menu-report`. Solo devuelve datos
 * reales cuando el tenant tiene el menú guiado habilitado (`connected`);
 * si no, `informational`/`progressive` quedan en null. Actividad v2 usa
 * `informational`/`progressive` para explicar el "no avanzó" del recorrido:
 * una respuesta a una FAQ (envíos, pagos, garantía, horarios) es una
 * conversación resuelta que nunca necesitó mover al lead — no es lo mismo
 * que "no le contestamos".
 */
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { API_BASE, authHeaders } from "@/lib/apiClient";

export interface MenuReport {
  connected: boolean;
  informational: number | null;
  progressive: number | null;
  loading: boolean;
}

const EMPTY: MenuReport = { connected: false, informational: null, progressive: null, loading: true };

interface Resp {
  connected: boolean;
  informational_replies?: number;
  progressive_replies?: number;
}

export function useMenuReport(apiSlug: string | undefined, hours = 168): MenuReport {
  const { accessToken, logout } = useAuth();
  const [s, setS] = useState<MenuReport>(EMPTY);

  useEffect(() => {
    if (!apiSlug || !accessToken) return;
    let cancelled = false;
    setS({ ...EMPTY });

    const params = new URLSearchParams({ tenant_id: apiSlug, hours: String(hours) });

    fetch(`${API_BASE}/api/metrics/menu-report?${params}`, { headers: authHeaders(accessToken) })
      .then(res => {
        if (res.status === 401) { logout(); return null; }
        return res.ok ? (res.json() as Promise<Resp>) : null;
      })
      .then(data => {
        if (cancelled || !data) return;
        setS({
          connected: data.connected,
          informational: data.informational_replies ?? null,
          progressive: data.progressive_replies ?? null,
          loading: false,
        });
      })
      .catch(() => {
        if (!cancelled) setS(prev => ({ ...prev, loading: false }));
      });

    return () => { cancelled = true; };
  }, [apiSlug, accessToken, hours]);

  return s;
}
