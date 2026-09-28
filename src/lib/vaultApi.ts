/**
 * src/lib/vaultApi.ts
 * ~~~~~~~~~~~~~~~~~~~
 * Thin client for /api/portal/vault/* (core/api/portal_vault.py). Every
 * value that goes over the wire here is already ciphertext, produced by
 * src/lib/vaultCrypto.ts — this module never sees a passphrase or item
 * plaintext.
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

export interface VaultSecretDto {
  exists: boolean;
  salt?: string;
  wrapped_dek_ciphertext?: string;
  wrapped_dek_iv?: string;
  recovery_ephemeral_public_key?: string;
  recovery_ciphertext?: string;
  recovery_iv?: string;
  version?: number;
  updated_at?: string;
  updated_by_email?: string | null;
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
    req<{ has_access: boolean }>(
      `/api/portal/vault/access?tenant_id=${encodeURIComponent(tenantId)}`,
      token,
    ),

  getSecret: (tenantId: string, token: string | null) =>
    req<VaultSecretDto>(`/api/portal/vault/secret?tenant_id=${encodeURIComponent(tenantId)}`, token),

  bootstrapSecret: (
    tenantId: string,
    token: string | null,
    body: Omit<VaultSecretDto, "exists" | "version" | "updated_at" | "updated_by_email">,
  ) =>
    req<VaultSecretDto>(`/api/portal/vault/secret`, token, {
      method: "POST",
      body: JSON.stringify({ tenant_id: tenantId, ...body }),
    }),

  rotateSecret: (
    tenantId: string,
    token: string | null,
    body: { expected_version: number; salt: string; wrapped_dek_ciphertext: string; wrapped_dek_iv: string },
  ) =>
    req<VaultSecretDto>(`/api/portal/vault/secret`, token, {
      method: "PATCH",
      body: JSON.stringify({ tenant_id: tenantId, ...body }),
    }),

  listItems: (tenantId: string, token: string | null) =>
    req<{ items: VaultItemDto[] }>(`/api/portal/vault/items?tenant_id=${encodeURIComponent(tenantId)}`, token),

  createItem: (tenantId: string, token: string | null, body: { ciphertext: string; iv: string }) =>
    req<VaultItemDto>(`/api/portal/vault/items`, token, {
      method: "POST",
      body: JSON.stringify({ tenant_id: tenantId, ...body }),
    }),

  updateItem: (tenantId: string, token: string | null, id: number, body: { ciphertext: string; iv: string }) =>
    req<VaultItemDto>(`/api/portal/vault/items/${id}`, token, {
      method: "PATCH",
      body: JSON.stringify({ tenant_id: tenantId, ...body }),
    }),

  deleteItem: (tenantId: string, token: string | null, id: number) =>
    req<{ ok: boolean }>(`/api/portal/vault/items/${id}?tenant_id=${encodeURIComponent(tenantId)}`, token, {
      method: "DELETE",
    }),
};
