import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { USER_CREDENTIALS, TENANTS, Tenant, TenantId } from "@/data/tenants";
import { supabase } from "@/lib/supabase";

interface AuthState {
  email:        string;
  tenantId:     string;
  displayName:  string;
  fromSupabase?: boolean;
}

interface AuthContextValue {
  user:         AuthState | null;
  tenant:       Tenant | null;
  initializing: boolean;           // true mientras se restaura sesión de localStorage
  login:  (email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const STORAGE_KEY = "umeia.portal.session";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,         setUser]         = useState<AuthState | null>(null);
  const [initializing, setInitializing] = useState(true); // bloquea redirect hasta leer storage

  // Restaurar sesión al montar — SINCRÓNICO para evitar flash de login
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch { /* storage corrupto — lo ignoramos */ }
    finally { setInitializing(false); }
  }, []);

  const login = async (
    email: string,
    password: string,
  ): Promise<{ ok: true } | { ok: false; error: string }> => {
    const normalized = email.trim().toLowerCase();

    // 1. Supabase (tenant_portal_users)
    try {
      const { data, error } = await supabase
        .from("tenant_portal_users")
        .select("id, tenant_id, email, password, display_name, portal_view")
        .eq("email", normalized)
        .maybeSingle();

      if (!error && data) {
        if (data.password !== password)
          return { ok: false, error: "Credenciales inválidas. Verificá email y contraseña." };

        const session: AuthState = {
          email:        normalized,
          tenantId:     data.portal_view || data.tenant_id,
          displayName:  data.display_name || normalized,
          fromSupabase: true,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
        setUser(session);
        return { ok: true };
      }
    } catch (err) {
      console.warn("[auth] Supabase no disponible, usando credenciales locales:", err);
    }

    // 2. Fallback hardcodeado (demo / offline)
    const record = USER_CREDENTIALS[normalized];
    if (!record || record.password !== password)
      return { ok: false, error: "Credenciales inválidas. Verificá email y contraseña." };

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

  const tenant = user ? (TENANTS[user.tenantId as TenantId] ?? null) : null;

  return (
    <AuthContext.Provider value={{ user, tenant, initializing, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
