/**
 * src/lib/legacyVaultCrypto.ts
 * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 * TEMPORARY — Phase A migration window only. Crypto primitives from the old
 * per-user-identity vault model (one X25519 keypair per portal user,
 * wrapped under that user's own passphrase). Used exclusively by
 * VaultLegacyMigration.tsx to unwrap an already-bootstrapped tenant's
 * legacy identity/DEK-wrap once, so its DEK can be re-bootstrapped into the
 * new shared-passphrase VaultTenantSecret model.
 *
 * Deleted in Phase B, alongside legacyVaultApi.ts, VaultLegacyMigration.tsx,
 * and the vault_identities/vault_dek_wraps tables — see
 * umeiacore/migrations for the Phase B migration that drops those tables.
 */
import { x25519 } from "@noble/curves/ed25519.js";

export { openSealedBox } from "@/lib/vaultCrypto";

export interface VaultKeypair {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
}

export function generateKeypair(): VaultKeypair {
  const privateKey = x25519.utils.randomSecretKey();
  return { privateKey, publicKey: x25519.getPublicKey(privateKey) };
}
