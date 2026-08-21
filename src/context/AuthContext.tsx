import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session } from "@supabase/supabase-js";
import { TENANTS, Tenant, TenantId } from "@/data/tenants";
import { supabase } from "@/lib/supabase";
import { API_BASE, authHeaders } from "@/lib/apiClient";

interface AuthState {
  email:       string;
  tenantId:    string;
  displayName: string;
}

interface AuthContextValue {
  user:         AuthState | null;
  tenant:       Tenant | null;
  session:      Session | null;
  accessToken:  string | null;
  initializing: boolean;           // true mientras se restaura la sesión de Supabase
  login:  (email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface PortalMeResp {
  tenant_id:    string;
  display_name: string;
  email:        string;
}

async function fetchPortalProfile(token: string): Promise<AuthState | null> {
  try {
    const res = await fetch(`${API_BASE}/api/portal/me`, { headers: authHeaders(token) });
    if (!res.ok) return null;
    const data = (await res.json()) as PortalMeResp;
    return { email: data.email, tenantId: data.tenant_id, displayName: data.display_name };
  } catch {
    return null;
  }
}

interface PortalBlock {
  name:          string;
  type:          "cloud" | "on-premise";
  vertical:      string;
  vertical_label: string;
  whatsapp: {
    number:    string;
    connected: boolean;
    cloud_api: boolean;
    mode:      string;
  };
}

// Onboardear un tenant nuevo (alta en el admin + tenant_configs/{slug}.json
// con su bloque `portal`) alcanza para que aparezca acá — sin esto, cada
// cliente nuevo requería además una PR a mano a este archivo (ver TENANTS
// más abajo, que se mantiene solo como fallback para los tenants legacy).
async function fetchTenantPortalInfo(token: string, apiSlug: string): Promise<Tenant | null> {
  try {
    const res = await fetch(
      `${API_BASE}/api/metrics/tenant-info?tenant_id=${encodeURIComponent(apiSlug)}`,
      { headers: authHeaders(token) },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { portal: PortalBlock | null };
    if (!data.portal) return null;
    const p = data.portal;
    return {
      id:            apiSlug,
      apiSlug,
      name:          p.name,
      type:          p.type,
      vertical:      p.vertical,
      verticalLabel: p.vertical_label,
      whatsapp: {
        number:    p.whatsapp.number,
        connected: p.whatsapp.connected,
        cloudApi:  p.whatsapp.cloud_api,
        mode:      p.whatsapp.mode,
      },
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session,      setSession]      = useState<Session | null>(null);
  const [user,         setUser]         = useState<AuthState | null>(null);
  const [initializing, setInitializing] = useState(true);

  // Fuente única de verdad para la sesión: Supabase Auth. Se resuelve una
  // vez al montar y se mantiene sincronizada (incluye refresh de token)
  // vía onAuthStateChange, así ningún componente hijo arranca con una
  // copia stale mientras la sesión real ya cambió.
  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      if (data.session) {
        const profile = await fetchPortalProfile(data.session.access_token);
        if (!cancelled) setUser(profile);
      }
      if (!cancelled) setInitializing(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (cancelled) return;
      setSession(newSession);
      if (newSession) {
        const profile = await fetchPortalProfile(newSession.access_token);
        if (!cancelled) setUser(profile);
      } else {
        setUser(null);
      }
    });

    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, []);

  const login = async (
    email: string,
    password: string,
  ): Promise<{ ok: true } | { ok: false; error: string }> => {
    const normalized = email.trim().toLowerCase();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalized,
      password,
    });
    if (error || !data.session) {
      return { ok: false, error: "Credenciales inválidas. Verificá email y contraseña." };
    }

    const profile = await fetchPortalProfile(data.session.access_token);
    if (!profile) {
      await supabase.auth.signOut();
      return { ok: false, error: "Tu cuenta no tiene acceso al portal. Contactá a tu referente." };
    }

    setSession(data.session);
    setUser(profile);
    return { ok: true };
  };

  const logout = () => {
    supabase.auth.signOut();
    setSession(null);
    setUser(null);
  };

  // El tenant_id que devuelve el backend puede venir como slug de API
  // ("electrorai") o como id de la tabla local ("electro-rai") — probamos
  // ambos para no depender de que coincidan exactamente.
  const staticTenant = user
    ? (TENANTS[user.tenantId as TenantId] ??
       Object.values(TENANTS).find(t => t.apiSlug === user.tenantId) ??
       null)
    : null;

  const accessToken = session?.access_token ?? null;

  // Fuente dinámica: tenant_configs/{slug}.json → /api/metrics/tenant-info.
  // El mapa estático (TENANTS) queda como fallback instantáneo (evita el
  // parpadeo mientras resuelve el fetch) y como respaldo si el tenant
  // todavía no tiene bloque `portal` en su config.
  const [tenant, setTenant] = useState<Tenant | null>(staticTenant);

  useEffect(() => {
    if (!user || !accessToken) {
      setTenant(null);
      return;
    }
    setTenant(staticTenant);
    let cancelled = false;
    const apiSlug = staticTenant?.apiSlug ?? user.tenantId;
    fetchTenantPortalInfo(accessToken, apiSlug).then((dynamic) => {
      if (!cancelled && dynamic) setTenant(dynamic);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.tenantId, accessToken]);

  return (
    <AuthContext.Provider value={{ user, tenant, session, accessToken, initializing, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
