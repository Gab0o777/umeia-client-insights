import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { USER_CREDENTIALS, TENANTS, Tenant, TenantId } from "@/data/tenants";
import { supabase } from "@/lib/supabase";

interface AuthState {
  email: string;
  tenantId: string;       // puede ser TenantId (mock) o tenant_fk de Supabase
  displayName: string;
  clientName?: string;    // nombre del cliente para mostrar cuando no hay tenant mock
  fromSupabase?: boolean; // true si el usuario viene de tenant_portal_users
}

interface AuthContextValue {
  user: AuthState | null;
  tenant: Tenant | null;
  login: (email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const STORAGE_KEY = "umeia.portal.session";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthState | null>(null);

  // Restaurar sesión desde localStorage al montar
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setUser(JSON.parse(raw));
      } catch { /* noop */ }
    }
  }, []);

  const login = async (
    email: string,
    password: string
  ): Promise<{ ok: true } | { ok: false; error: string }> => {
    const normalized = email.trim().toLowerCase();

    // ── 1. Intentar autenticación via Supabase (tenant_portal_users) ──
    try {
      const { data, error } = await supabase
        .from("tenant_portal_users")
        .select("id, tenant_id, email, password, display_name, portal_view")
        .eq("email", normalized)
        .maybeSingle();

      if (!error && data) {
        if (data.password !== password) {
          return { ok: false, error: "Credenciales inválidas. Verificá email y contraseña." };
        }
        // Usuario encontrado en Supabase
        const session: AuthState = {
          email:        normalized,
          tenantId:     data.portal_view || data.tenant_id, // portal_view es la vista; tenant_id es el FK
          displayName:  data.display_name || normalized,
          fromSupabase: true,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
        setUser(session);
        return { ok: true };
      }
      // Si error de Supabase (sin conexión, etc.) caemos al fallback
    } catch (err) {
      console.warn("[auth] Supabase unavailable, falling back to local credentials:", err);
    }

    // ── 2. Fallback: credenciales hardcodeadas (demo / offline) ──
    const record = USER_CREDENTIALS[normalized];
    if (!record || record.password !== password) {
      return { ok: false, error: "Credenciales inválidas. Verificá email y contraseña." };
    }
    const session: AuthState = {
      email:       normalized,
      tenantId:    record.tenantId,
      displayName: record.displayName,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    setUser(session);
    return { ok: true };
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  };

  // Resuelve el tenant: primero intenta con TenantId del mock,
  // si no lo encuentra devuelve null (el layout muestra una vista genérica).
  const tenant = user
    ? (TENANTS[user.tenantId as TenantId] ?? null)
    : null;

  return (
    <AuthContext.Provider value={{ user, tenant, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
