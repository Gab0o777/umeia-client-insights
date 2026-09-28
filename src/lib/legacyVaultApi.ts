/**
 * src/lib/legacyVaultApi.ts
 * ~~~~~~~~~~~~~~~~~~~~~~~~~
 * TEMPORARY — Phase A migration window only. Read-only client for the two
 * legacy endpoints kept in core/api/portal_vault.py solely so an
 * already-bootstrapped (old per-user-identity model) tenant can migrate.
 * Used exclusively by VaultLegacyMigration.tsx. Deleted in Phase B along
 * with those endpoints — see umeiacore migrations.
 */
import { API_BASE, authHeaders } from "@/lib/apiClient";

async function req<T>(path: string, token: string | null): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { headers: authHeaders(token) });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Vault request failed (${res.status})`);
  }
  return res.json();
}

export interface LegacyVaultIdentityDto {
  exists: boolean;
  portal_user_email?: string;
  salt?: string;
  public_key?: string;
  wrapped_private_key_ciphertext?: string;
  wrapped_private_key_iv?: string;
  recovery_salt?: string;
  recovery_wrapped_private_key_ciphertext?: string;
  recovery_wrapped_private_key_iv?: string;
}

export interface LegacyDekWrapDto {
  exists: boolean;
  ephemeral_public_key?: string;
  ciphertext?: string;
  iv?: string;
}

export const legacyVaultApi = {
  getIdentity: (tenantId: string, token: string | null) =>
    req<LegacyVaultIdentityDto>(`/api/portal/vault/identity?tenant_id=${encodeURIComponent(tenantId)}`, token),

  getDekWrap: (tenantId: string, token: string | null) =>
    req<LegacyDekWrapDto>(`/api/portal/vault/dek-wrap?tenant_id=${encodeURIComponent(tenantId)}`, token),
};
