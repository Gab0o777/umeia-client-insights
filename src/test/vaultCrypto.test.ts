import { describe, expect, it } from "vitest";
import { x25519 } from "@noble/curves/ed25519.js";
import {
  aesGcmDecrypt,
  aesGcmEncrypt,
  base64ToBytes,
  bytesToBase64,
  bytesToUtf8,
  deriveKek,
  generateDek,
  generateSalt,
  openSealedBox,
  sealForRecipient,
  utf8ToBytes,
} from "@/lib/vaultCrypto";

/** Test-only helper: an X25519 keypair, used to exercise sealForRecipient/
 * openSealedBox in isolation. In production these functions only ever seal
 * TO Umeia's fixed recovery public key — nothing in the shipped app
 * generates a recipient keypair, so this lives here, not in vaultCrypto.ts. */
function randomX25519Keypair() {
  const privateKey = x25519.utils.randomSecretKey();
  return { privateKey, publicKey: x25519.getPublicKey(privateKey) };
}

/** Simulates bootstrapping the tenant's shared secret: passphrase -> wrapped DEK. */
async function bootstrap(passphrase: string) {
  const salt = generateSalt();
  const kek = await deriveKek(passphrase, salt);
  const dek = generateDek();
  const wrappedDek = await aesGcmEncrypt(kek, dek);
  return { salt, dek, wrappedDek };
}

async function unlock(passphrase: string, salt: Uint8Array, wrappedDek: Awaited<ReturnType<typeof aesGcmEncrypt>>) {
  const kek = await deriveKek(passphrase, salt);
  return aesGcmDecrypt(kek, wrappedDek);
}

describe("deriveKek", () => {
  it("is deterministic for the same passphrase + salt", async () => {
    const salt = generateSalt();
    const a = await deriveKek("correct horse battery staple", salt);
    const b = await deriveKek("correct horse battery staple", salt);
    expect(a).toEqual(b);
  });

  it("produces different keys for different salts, same passphrase", async () => {
    const a = await deriveKek("correct horse battery staple", generateSalt());
    const b = await deriveKek("correct horse battery staple", generateSalt());
    expect(a).not.toEqual(b);
  });

  it("produces different keys for different passphrases, same salt", async () => {
    const salt = generateSalt();
    const a = await deriveKek("correct horse battery staple", salt);
    const b = await deriveKek("correct horse battery staple!", salt); // one char off
    expect(a).not.toEqual(b);
  });

  it("handles unicode and empty-ish passphrases without throwing", async () => {
    const salt = generateSalt();
    await expect(deriveKek("contraseña-áéíóú-🔒", salt)).resolves.toHaveLength(32);
    await expect(deriveKek("a", salt)).resolves.toHaveLength(32);
  });
});

describe("AES-GCM wrap/unwrap (shared passphrase -> tenant DEK)", () => {
  it("round-trips the DEK with the correct shared passphrase", async () => {
    const { salt, dek, wrappedDek } = await bootstrap("correct horse battery staple");
    const recovered = await unlock("correct horse battery staple", salt, wrappedDek);
    expect(recovered).toEqual(dek);
  });

  it("rejects a wrong passphrase (auth tag failure, not garbage output)", async () => {
    const { salt, wrappedDek } = await bootstrap("correct horse battery staple");
    await expect(unlock("wrong guess", salt, wrappedDek)).rejects.toThrow();
  });

  it("rejects a tampered ciphertext even with the right passphrase", async () => {
    const { salt, wrappedDek } = await bootstrap("correct horse battery staple");
    const tampered = { ...wrappedDek, ciphertext: wrappedDek.ciphertext.slice() };
    tampered.ciphertext[0] ^= 0xff; // flip a bit
    await expect(unlock("correct horse battery staple", salt, tampered)).rejects.toThrow();
  });

  it("rejects reuse of the wrong salt", async () => {
    const secret = await bootstrap("correct horse battery staple");
    const otherSalt = generateSalt();
    await expect(unlock("correct horse battery staple", otherSalt, secret.wrappedDek)).rejects.toThrow();
  });

  it("never reuses an IV across two encryptions of the same plaintext", async () => {
    const key = crypto.getRandomValues(new Uint8Array(32));
    const plaintext = utf8ToBytes("same secret both times");
    const a = await aesGcmEncrypt(key, plaintext);
    const b = await aesGcmEncrypt(key, plaintext);
    expect(a.iv).not.toEqual(b.iv);
    expect(a.ciphertext).not.toEqual(b.ciphertext);
  });
});

describe("passphrase rotation invariant", () => {
  it("re-wrapping the same DEK under a new passphrase/salt leaves items decryptable", async () => {
    const passphrase1 = "correct horse battery staple";
    const { dek } = await bootstrap(passphrase1);

    const item = { site: "aws.amazon.com", user: "root", pass: "s3cr3t!" };
    const encryptedItem = await aesGcmEncrypt(dek, utf8ToBytes(JSON.stringify(item)));

    // rotate: re-wrap the SAME dek under a brand-new passphrase/salt
    const passphrase2 = "another correct horse";
    const newSalt = generateSalt();
    const newKek = await deriveKek(passphrase2, newSalt);
    const rewrapped = await aesGcmEncrypt(newKek, dek);

    const recoveredDek = await unlock(passphrase2, newSalt, rewrapped);
    const recoveredItem = JSON.parse(bytesToUtf8(await aesGcmDecrypt(recoveredDek, encryptedItem)));
    expect(recoveredItem).toEqual(item);
  });

  it("the old passphrase no longer unwraps the new wrapping", async () => {
    const passphrase1 = "correct horse battery staple";
    const { dek, salt: oldSalt } = await bootstrap(passphrase1);

    const passphrase2 = "another correct horse";
    const newSalt = generateSalt();
    const newKek = await deriveKek(passphrase2, newSalt);
    const rewrapped = await aesGcmEncrypt(newKek, dek);

    await expect(unlock(passphrase1, oldSalt, rewrapped)).rejects.toThrow();
  });
});

describe("sealed box (sealing the tenant DEK to Umeia's recovery public key)", () => {
  it("lets the recipient recover a DEK sealed with only their public key", async () => {
    const recipient = randomX25519Keypair();
    const dek = generateDek();
    const sealed = await sealForRecipient(recipient.publicKey, dek);
    const recovered = await openSealedBox(recipient.privateKey, sealed);
    expect(recovered).toEqual(dek);
  });

  it("a different recipient's private key cannot open the box", async () => {
    const recipient = randomX25519Keypair();
    const impostor = randomX25519Keypair();
    const dek = generateDek();
    const sealed = await sealForRecipient(recipient.publicKey, dek);
    await expect(openSealedBox(impostor.privateKey, sealed)).rejects.toThrow();
  });
});

describe("end-to-end: shared passphrase to a decrypted vault item", () => {
  it("full hierarchy round-trips for a realistic item payload", async () => {
    const passphrase = "correct horse battery staple";
    const { salt, dek, wrappedDek } = await bootstrap(passphrase);

    const item = { site: "aws.amazon.com", user: "root", pass: "s3cr3t!", notes: "MFA en 1Password" };
    const encryptedItem = await aesGcmEncrypt(dek, utf8ToBytes(JSON.stringify(item)));

    // --- a different teammate, new session, only the shared passphrase is known ---
    const recoveredDek = await unlock(passphrase, salt, wrappedDek);
    const recoveredItem = JSON.parse(bytesToUtf8(await aesGcmDecrypt(recoveredDek, encryptedItem)));

    expect(recoveredItem).toEqual(item);
  });

  it("handles empty, large, and binary-ish item payloads", async () => {
    const dek = generateDek();

    const empty = await aesGcmEncrypt(dek, utf8ToBytes(""));
    expect(bytesToUtf8(await aesGcmDecrypt(dek, empty))).toBe("");

    const large = "x".repeat(200_000);
    const largeBlob = await aesGcmEncrypt(dek, utf8ToBytes(large));
    expect(bytesToUtf8(await aesGcmDecrypt(dek, largeBlob))).toBe(large);

    const binary = crypto.getRandomValues(new Uint8Array(256));
    const binaryBlob = await aesGcmEncrypt(dek, binary);
    expect(await aesGcmDecrypt(dek, binaryBlob)).toEqual(binary);
  });

  it("an item encrypted under one tenant's DEK is unreadable under another's", async () => {
    const dekA = generateDek();
    const dekB = generateDek();
    const item = await aesGcmEncrypt(dekA, utf8ToBytes("tenant A's password"));
    await expect(aesGcmDecrypt(dekB, item)).rejects.toThrow();
  });
});

describe("base64 wire format", () => {
  it("round-trips arbitrary byte values, including 0x00 and 0xff", async () => {
    const bytes = new Uint8Array([0, 1, 255, 128, 16, 254, 7]);
    expect(base64ToBytes(bytesToBase64(bytes))).toEqual(bytes);
  });

  it("round-trips real crypto outputs (salt, DEK, ciphertext)", async () => {
    const salt = generateSalt();
    expect(base64ToBytes(bytesToBase64(salt))).toEqual(salt);

    const dek = generateDek();
    expect(base64ToBytes(bytesToBase64(dek))).toEqual(dek);

    const blob = await aesGcmEncrypt(dek, utf8ToBytes("round trip me"));
    const rehydrated = {
      iv: base64ToBytes(bytesToBase64(blob.iv)),
      ciphertext: base64ToBytes(bytesToBase64(blob.ciphertext)),
    };
    expect(bytesToUtf8(await aesGcmDecrypt(dek, rehydrated))).toBe("round trip me");
  });
});
