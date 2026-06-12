import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { USER_CREDENTIALS, TENANTS, Tenant, TenantId } from "@/data/tenants";

interface AuthState {
  email: string;
  tenantId: TenantId;
  displayName: string;
}

interface AuthContextValue {
  user: AuthState | null;
  tenant: Tenant | null;
  login: (email: string, password: string) => { ok: true } | { ok: false; error: string };
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const STORAGE_KEY = "umeia.portal.session";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthState | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setUser(JSON.parse(raw));
      } catch { /* noop */ }
    }
  }, []);

  const login = (email: string, password: string) => {
    const normalized = email.trim().toLowerCase();
    const record = USER_CREDENTIALS[normalized];
    if (!record || record.password !== password) {
      return { ok: false as const, error: "Credenciales inválidas. Verificá email y contraseña." };
    }
    const session: AuthState = {
      email: normalized,
      tenantId: record.tenantId,
      displayName: record.displayName,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    setUser(session);
    return { ok: true as const };
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  };

  const tenant = user ? TENANTS[user.tenantId] : null;

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
