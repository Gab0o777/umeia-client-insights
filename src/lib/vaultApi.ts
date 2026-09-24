/**
 * src/lib/vaultApi.ts
 * ~~~~~~~~~~~~~~~~~~~
 * Thin client for /api/portal/vault/* (core/api/portal_vault.py). Every
 * value that goes over the wire here is already ciphertext, produced by
 * src/lib/vaultCrypto.ts — this module never sees a passphrase, a private
 * key, or item plaintext.
 */
import { API_BASE, authHeaders } from "@/lib/apiClient";

async function req<T>(path: string, token: string | null, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...authHeaders(token), ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Vault request failed (${res.status})`);
  }
  return res.json();
}

export interface VaultIdentityDto {
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

export interface DekWrapDto {
  exists: boolean;
  is_first_admin?: boolean;
  ephemeral_public_key?: string;
  ciphertext?: string;
  iv?: string;
}

export interface PendingRecipient {
  vault_identity_id: number;
  portal_user_email: string;
  public_key: string;
}

export interface VaultItemDto {
  id: number;
  ciphertext: string;
  iv: string;
  created_by_email: string | null;
  created_at: string;
  updated_at: string;
}

export const vaultApi = {
  getAccess: (tenantId: string, token: string | null) =>
    req<{ has_access: boolean; is_vault_admin: boolean }>(
      `/api/portal/vault/access?tenant_id=${encodeURIComponent(tenantId)}`,
      token,
    ),

  getIdentity: (tenantId: string, token: string | null) =>
    req<VaultIdentityDto>(`/api/portal/vault/identity?tenant_id=${encodeURIComponent(tenantId)}`, token),

  createIdentity: (
    tenantId: string,
    token: string | null,
    body: Omit<VaultIdentityDto, "exists" | "portal_user_email">,
  ) =>
    req<{ ok: boolean; vault_identity_id: number }>(`/api/portal/vault/identity`, token, {
      method: "POST",
      body: JSON.stringify({ tenant_id: tenantId, ...body }),
    }),

  rewrapPassphrase: (
    tenantId: string,
    token: string | null,
    body: { salt: string; wrapped_private_key_ciphertext: string; wrapped_private_key_iv: string },
  ) =>
    req<{ ok: boolean }>(`/api/portal/vault/identity/passphrase`, token, {
      method: "PUT",
      body: JSON.stringify({ tenant_id: tenantId, ...body }),
    }),

  getDekWrap: (tenantId: string, token: string | null) =>
    req<DekWrapDto>(`/api/portal/vault/dek-wrap?tenant_id=${encodeURIComponent(tenantId)}`, token),

  putDekWrap: (
    tenantId: string,
    token: string | null,
    body: { vault_identity_id: number; ephemeral_public_key: string; ciphertext: string; iv: string },
  ) =>
    req<{ ok: boolean }>(`/api/portal/vault/dek-wrap`, token, {
      method: "PUT",
      body: JSON.stringify({ tenant_id: tenantId, ...body }),
    }),

  getPendingRecipients: (tenantId: string, token: string | null) =>
    req<{ pending: PendingRecipient[] }>(
      `/api/portal/vault/pending-recipients?tenant_id=${encodeURIComponent(tenantId)}`,
      token,
    ),

  listItems: (tenantId: string, token: string | null) =>
    req<{ items: VaultItemDto[] }>(`/api/portal/vault/items?tenant_id=${encodeURIComponent(tenantId)}`, token),

  createItem: (tenantId: string, token: string | null, body: { ciphertext: string; iv: string }) =>
    req<VaultItemDto>(`/api/portal/vault/items`, token, {
      method: "POST",
      body: JSON.stringify({ tenant_id: tenantId, ...body }),
    }),

  updateItem: (tenantId: string, token: string | null, id: number, body: { ciphertext: string; iv: string }) =>
    req<VaultItemDto>(`/api/portal/vault/items/${id}`, token, {
      method: "PUT",
      body: JSON.stringify({ tenant_id: tenantId, ...body }),
    }),

  deleteItem: (tenantId: string, token: string | null, id: number) =>
    req<{ ok: boolean }>(`/api/portal/vault/items/${id}?tenant_id=${encodeURIComponent(tenantId)}`, token, {
      method: "DELETE",
    }),
};
