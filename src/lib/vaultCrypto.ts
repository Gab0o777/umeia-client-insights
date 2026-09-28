/**
 * src/lib/vaultCrypto.ts
 * ~~~~~~~~~~~~~~~~~~~~~~
 * Client-side crypto for the E2EE vault. Everything here runs in the
 * browser; the backend only ever stores the outputs of these functions
 * (salt, wrapped DEK, ciphertext, nonces) and never sees a passphrase,
 * the DEK, or item plaintext.
 *
 * Key hierarchy:
 *   shared passphrase --Argon2id(salt)--> KEK --AES-GCM--> wraps the
 *   tenant's single DEK. Every portal user in the tenant unlocks with
 *   the SAME passphrase — there is no per-user identity or per-user
 *   share step.
 *
 * The DEK is additionally sealed once, at bootstrap time, to Umeia's own
 * recovery public key (sealForRecipient below) so the Umeia team can
 * recover a tenant's vault in a genuine emergency (see
 * umeiacore/scripts/vault_emergency_recover.py) — the corresponding
 * private key is held outside this app entirely.
 */
import { argon2id } from "hash-wasm";
import { x25519 } from "@noble/curves/ed25519.js";

/**
 * Umeia's vault recovery public key (not secret — this is the PUBLIC half
 * of a keypair generated once via umeiacore/scripts/generate_vault_recovery_keypair.py).
 * The matching private key is stored only in the Umeia team's password
 * manager, never in any repo or .env — see scripts/vault_emergency_recover.py.
 */
export const VAULT_RECOVERY_PUBLIC_KEY_B64 = "+XG3SVhdubYN/yObKGpWRzKnNC7oY8y5JL1FqYD66yE=";

export interface WrappedBlob {
  iv: Uint8Array;
  ciphertext: Uint8Array;
}

export interface SealedBox {
  ephemeralPublicKey: Uint8Array;
  iv: Uint8Array;
  ciphertext: Uint8Array;
}

const ARGON2ID_PARAMS = {
  parallelism: 1,
  iterations: 3,
  memorySize: 65536, // 64MB
  hashLength: 32,
} as const;

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export async function deriveKek(secret: string, salt: Uint8Array): Promise<Uint8Array> {
  const hex = await argon2id({
    password: secret,
    salt,
    ...ARGON2ID_PARAMS,
    outputType: "hex",
  });
  return hexToBytes(hex);
}

export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}

export function generateDek(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

export async function aesGcmEncrypt(key: Uint8Array, plaintext: Uint8Array): Promise<WrappedBlob> {
  const cryptoKey = await crypto.subtle.importKey("raw", key, "AES-GCM", false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, cryptoKey, plaintext),
  );
  return { iv, ciphertext };
}

/** Throws (DOMException) if `key` is wrong or `blob` was tampered with — AES-GCM is authenticated. */
export async function aesGcmDecrypt(key: Uint8Array, blob: WrappedBlob): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey("raw", key, "AES-GCM", false, ["decrypt"]);
  return new Uint8Array(
    await crypto.subtle.decrypt({ name: "AES-GCM", iv: blob.iv }, cryptoKey, blob.ciphertext),
  );
}

/**
 * Anonymous sealed box (ECIES-style): wraps `secret` for `recipientPublicKey`
 * using a fresh ephemeral keypair, so the sender needs only the recipient's
 * PUBLIC key — the recipient doesn't need to be online to receive it.
 */
export async function sealForRecipient(
  recipientPublicKey: Uint8Array,
  secret: Uint8Array,
): Promise<SealedBox> {
  const ephemeralPrivateKey = x25519.utils.randomSecretKey();
  const ephemeralPublicKey = x25519.getPublicKey(ephemeralPrivateKey);
  const shared = x25519.getSharedSecret(ephemeralPrivateKey, recipientPublicKey);
  const aesKey = new Uint8Array(await crypto.subtle.digest("SHA-256", shared));
  const { iv, ciphertext } = await aesGcmEncrypt(aesKey, secret);
  return { ephemeralPublicKey, iv, ciphertext };
}

export async function openSealedBox(
  recipientPrivateKey: Uint8Array,
  sealed: SealedBox,
): Promise<Uint8Array> {
  const shared = x25519.getSharedSecret(recipientPrivateKey, sealed.ephemeralPublicKey);
  const aesKey = new Uint8Array(await crypto.subtle.digest("SHA-256", shared));
  return aesGcmDecrypt(aesKey, { iv: sealed.iv, ciphertext: sealed.ciphertext });
}

export function bytesToUtf8(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

export function utf8ToBytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

/** Wire format for every blob sent to the backend — it only ever stores base64 text. */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
