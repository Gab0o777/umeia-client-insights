/**
 * src/lib/vaultSetup.ts
 * ~~~~~~~~~~~~~~~~~~~~~
 * One-time vault identity onboarding: passphrase -> keypair -> recovery key
 * -> tenant DEK (bootstrapped if this is the first admin, inherited if
 * another admin already unlocked and shared it). Shared by the activation
 * wizard (Modulos.tsx, module currently off) and the Bóveda page's own
 * setup screen (a second admin whose grant/module are already active).
 */
import { vaultApi } from "@/lib/vaultApi";
import {
  aesGcmEncrypt, base64ToBytes, bytesToBase64, deriveKek, generateDek, generateKeypair,
  generateRecoverySecret, generateSalt, openSealedBox, sealForRecipient,
} from "@/lib/vaultCrypto";

export interface VaultSetupResult {
  privateKey: Uint8Array;
  /** null when granted but nobody with the vault already unlocked has shared the DEK yet. */
  dek: Uint8Array | null;
  recoveryCode: string;
}

export async function setupVaultIdentity(
  tenantId: string,
  accessToken: string,
  passphrase: string,
): Promise<VaultSetupResult> {
  const salt = generateSalt();
  const kek = await deriveKek(passphrase, salt);
  const keypair = generateKeypair();
  const wrapped = await aesGcmEncrypt(kek, keypair.privateKey);

  const recovery = generateRecoverySecret();
  const recoverySalt = generateSalt();
  const recoveryKek = await deriveKek(recovery, recoverySalt);
  const wrappedForRecovery = await aesGcmEncrypt(recoveryKek, keypair.privateKey);

  const created = await vaultApi.createIdentity(tenantId, accessToken, {
    salt: bytesToBase64(salt),
    public_key: bytesToBase64(keypair.publicKey),
    wrapped_private_key_ciphertext: bytesToBase64(wrapped.ciphertext),
    wrapped_private_key_iv: bytesToBase64(wrapped.iv),
    recovery_salt: bytesToBase64(recoverySalt),
    recovery_wrapped_private_key_ciphertext: bytesToBase64(wrappedForRecovery.ciphertext),
    recovery_wrapped_private_key_iv: bytesToBase64(wrappedForRecovery.iv),
  });

  const dekWrap = await vaultApi.getDekWrap(tenantId, accessToken);

  if (!dekWrap.exists && dekWrap.is_first_admin) {
    const dek = generateDek();
    const sealed = await sealForRecipient(keypair.publicKey, dek);
    await vaultApi.putDekWrap(tenantId, accessToken, {
      vault_identity_id: created.vault_identity_id,
      ephemeral_public_key: bytesToBase64(sealed.ephemeralPublicKey),
      ciphertext: bytesToBase64(sealed.ciphertext),
      iv: bytesToBase64(sealed.iv),
    });
    return { privateKey: keypair.privateKey, dek, recoveryCode: recovery };
  }

  if (dekWrap.exists) {
    const dek = await openSealedBox(keypair.privateKey, {
      ephemeralPublicKey: base64ToBytes(dekWrap.ephemeral_public_key!),
      ciphertext: base64ToBytes(dekWrap.ciphertext!),
      iv: base64ToBytes(dekWrap.iv!),
    });
    return { privateKey: keypair.privateKey, dek, recoveryCode: recovery };
  }

  return { privateKey: keypair.privateKey, dek: null, recoveryCode: recovery };
}
