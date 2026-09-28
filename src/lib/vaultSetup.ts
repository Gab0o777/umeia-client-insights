/**
 * src/lib/vaultSetup.ts
 * ~~~~~~~~~~~~~~~~~~~~~
 * Bootstrap/unlock/rotation for the tenant's single shared vault passphrase.
 * Any portal user in the tenant can bootstrap (if nobody has yet) or unlock
 * (with the same passphrase everyone else uses) — there is no per-user
 * identity and no "share with this person" step anymore.
 */
import { vaultApi } from "@/lib/vaultApi";
import {
  VAULT_RECOVERY_PUBLIC_KEY_B64,
  aesGcmDecrypt, aesGcmEncrypt, base64ToBytes, bytesToBase64, deriveKek, generateDek,
  generateSalt, sealForRecipient,
} from "@/lib/vaultCrypto";

/**
 * Bootstraps the tenant's shared secret around `dek` (a freshly generated
 * one for a brand-new tenant, or a DEK recovered from the legacy per-user
 * scheme during migration — see VaultLegacyMigration.tsx — so existing
 * items stay decryptable either way).
 */
async function bootstrapVaultWithDek(
  tenantId: string,
  accessToken: string,
  passphrase: string,
  dek: Uint8Array,
): Promise<{ dek: Uint8Array; version: number }> {
  const salt = generateSalt();
  const kek = await deriveKek(passphrase, salt);
  const wrapped = await aesGcmEncrypt(kek, dek);

  const recoverySealed = await sealForRecipient(base64ToBytes(VAULT_RECOVERY_PUBLIC_KEY_B64), dek);

  const created = await vaultApi.bootstrapSecret(tenantId, accessToken, {
    salt: bytesToBase64(salt),
    wrapped_dek_ciphertext: bytesToBase64(wrapped.ciphertext),
    wrapped_dek_iv: bytesToBase64(wrapped.iv),
    recovery_ephemeral_public_key: bytesToBase64(recoverySealed.ephemeralPublicKey),
    recovery_ciphertext: bytesToBase64(recoverySealed.ciphertext),
    recovery_iv: bytesToBase64(recoverySealed.iv),
  });

  return { dek, version: created.version! };
}

export async function bootstrapVault(
  tenantId: string,
  accessToken: string,
  passphrase: string,
): Promise<{ dek: Uint8Array; version: number }> {
  return bootstrapVaultWithDek(tenantId, accessToken, passphrase, generateDek());
}

/**
 * TEMPORARY — Phase A migration window only. Bootstraps the new
 * shared-passphrase secret reusing a DEK recovered from the legacy
 * per-user-identity scheme (see VaultLegacyMigration.tsx), instead of
 * generating a fresh one, so existing items stay decryptable.
 */
export async function migrateVaultToSharedPassphrase(
  tenantId: string,
  accessToken: string,
  newPassphrase: string,
  recoveredDek: Uint8Array,
): Promise<{ dek: Uint8Array; version: number }> {
  return bootstrapVaultWithDek(tenantId, accessToken, newPassphrase, recoveredDek);
}

/** Throws if `passphrase` is wrong (AES-GCM auth tag failure). */
export async function unlockVault(
  tenantId: string,
  accessToken: string,
  passphrase: string,
): Promise<{ dek: Uint8Array; version: number }> {
  const secret = await vaultApi.getSecret(tenantId, accessToken);
  if (!secret.exists) throw new Error("La bóveda todavía no fue inicializada.");

  const kek = await deriveKek(passphrase, base64ToBytes(secret.salt!));
  const dek = await aesGcmDecrypt(kek, {
    ciphertext: base64ToBytes(secret.wrapped_dek_ciphertext!),
    iv: base64ToBytes(secret.wrapped_dek_iv!),
  });
  return { dek, version: secret.version! };
}

/**
 * Re-wraps the SAME dek under a brand-new passphrase/salt. `expectedVersion`
 * must be the version last fetched via getSecret/unlockVault/bootstrapVault
 * — a mismatch means someone else rotated first (409), caller should
 * refetch and retry.
 */
export async function rotateVaultPassphrase(
  tenantId: string,
  accessToken: string,
  dek: Uint8Array,
  newPassphrase: string,
  expectedVersion: number,
): Promise<{ version: number }> {
  const salt = generateSalt();
  const kek = await deriveKek(newPassphrase, salt);
  const wrapped = await aesGcmEncrypt(kek, dek);

  const updated = await vaultApi.rotateSecret(tenantId, accessToken, {
    expected_version: expectedVersion,
    salt: bytesToBase64(salt),
    wrapped_dek_ciphertext: bytesToBase64(wrapped.ciphertext),
    wrapped_dek_iv: bytesToBase64(wrapped.iv),
  });
  return { version: updated.version! };
}
