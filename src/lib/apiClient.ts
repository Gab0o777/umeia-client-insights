/**
 * src/lib/apiClient.ts
 * ~~~~~~~~~~~~~~~~~~~~
 * Shared API_BASE + auth header helper for calls to the umeiacore backend.
 * Every authenticated hook/component builds its Authorization header from
 * the Supabase session token exposed by useAuth() — see AuthContext.tsx.
 */

export const API_BASE = import.meta.env.DEV
  ? "/umeia-api"
  : (import.meta.env.VITE_API_URL ?? "https://umeia.space");

export function authHeaders(token: string | undefined | null): HeadersInit {
  return token ? { Authorization: `Bearer ${token}` } : {};
}
