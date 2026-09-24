/**
 * src/lib/vaultCrypto.ts
 * ~~~~~~~~~~~~~~~~~~~~~~
 * Client-side crypto for the E2EE vault. Everything here runs in the
 * browser; the backend only ever stores the outputs of these functions
 * (salts, public keys, ciphertext, nonces) and never sees a passphrase,
 * a private key, the DEK, or item plaintext.
 *
 * Key hierarchy:
 *   passphrase --Argon2id(salt)--> KEK --AES-GCM--> wraps the user's
 *   X25519 private key. The tenant's DEK is sealed once per vault-admin
 *   using each admin's X25519 public key, so granting access to a new
 *   admin never requires the server (or any other admin) to see a
 *   private key or the DEK in plaintext.
 *
 * A recovery key follows the exact same wrapping shape as the passphrase
 * (its own random secret -> Argon2id -> KEK -> wraps the same private
 * key under a second salt) so losing the passphrase doesn't require
 * re-issuing a new identity/keypair.
 */
import { argon2id } from "hash-wasm";
import { x25519 } from "@noble/curves/ed25519.js";

export interface WrappedBlob {
  iv: Uint8Array;
  ciphertext: Uint8Array;
}

export interface SealedBox {
  ephemeralPublicKey: Uint8Array;
  iv: Uint8Array;
  ciphertext: Uint8Array;
}

export interface VaultKeypair {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
}

const ARGON2ID_PARAMS = {
  parallelism: 1,
  iterations: 3,
  memorySize: 65536, // 64MB
  hashLength: 32,
} as const;

export async function deriveKek(secret: string, salt: Uint8Array): Promise<Uint8Array> {
  const hex = await argon2id({
    password: secret,
    salt,
    ...ARGON2ID_PARAMS,
    outputType: "hex",
  });
  return Uint8Array.from(Buffer.from(hex, "hex"));
}

export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}

export function generateKeypair(): VaultKeypair {
  const privateKey = x25519.utils.randomSecretKey();
  return { privateKey, publicKey: x25519.getPublicKey(privateKey) };
}

export function generateDek(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

/** Generates a high-entropy recovery secret, e.g. to render once as a printable code. */
export function generateRecoverySecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
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
