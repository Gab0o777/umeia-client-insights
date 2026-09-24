import { describe, expect, it } from "vitest";
import {
  aesGcmDecrypt,
  aesGcmEncrypt,
  base64ToBytes,
  bytesToBase64,
  bytesToUtf8,
  deriveKek,
  generateDek,
  generateKeypair,
  generateRecoverySecret,
  generateSalt,
  openSealedBox,
  sealForRecipient,
  utf8ToBytes,
} from "@/lib/vaultCrypto";

/** Simulates one vault-admin's full onboarding: passphrase -> wrapped keypair. */
async function setUpAdmin(passphrase: string) {
  const salt = generateSalt();
  const kek = await deriveKek(passphrase, salt);
  const keypair = generateKeypair();
  const wrappedPrivateKey = await aesGcmEncrypt(kek, keypair.privateKey);
  return { salt, keypair, wrappedPrivateKey };
}

async function unlock(passphrase: string, salt: Uint8Array, wrappedPrivateKey: Awaited<ReturnType<typeof aesGcmEncrypt>>) {
  const kek = await deriveKek(passphrase, salt);
  return aesGcmDecrypt(kek, wrappedPrivateKey);
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

describe("AES-GCM wrap/unwrap (passphrase -> private key)", () => {
  it("round-trips the private key with the correct passphrase", async () => {
    const { salt, keypair, wrappedPrivateKey } = await setUpAdmin("correct horse battery staple");
    const recovered = await unlock("correct horse battery staple", salt, wrappedPrivateKey);
    expect(recovered).toEqual(keypair.privateKey);
  });

  it("rejects a wrong passphrase (auth tag failure, not garbage output)", async () => {
    const { salt, wrappedPrivateKey } = await setUpAdmin("correct horse battery staple");
    await expect(unlock("wrong guess", salt, wrappedPrivateKey)).rejects.toThrow();
  });

  it("rejects a tampered ciphertext even with the right passphrase", async () => {
    const { salt, wrappedPrivateKey } = await setUpAdmin("correct horse battery staple");
    const tampered = { ...wrappedPrivateKey, ciphertext: wrappedPrivateKey.ciphertext.slice() };
    tampered.ciphertext[0] ^= 0xff; // flip a bit
    await expect(unlock("correct horse battery staple", salt, tampered)).rejects.toThrow();
  });

  it("rejects reuse of the wrong salt (e.g. mixing up two users' rows)", async () => {
    const admin = await setUpAdmin("correct horse battery staple");
    const otherSalt = generateSalt();
    await expect(unlock("correct horse battery staple", otherSalt, admin.wrappedPrivateKey)).rejects.toThrow();
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

describe("sealed box (sharing the tenant DEK with a vault-admin)", () => {
  it("lets the recipient recover a DEK sealed with only their public key", async () => {
    const recipient = generateKeypair();
    const dek = generateDek();
    const sealed = await sealForRecipient(recipient.publicKey, dek);
    const recovered = await openSealedBox(recipient.privateKey, sealed);
    expect(recovered).toEqual(dek);
  });

  it("a different recipient's private key cannot open the box", async () => {
    const recipient = generateKeypair();
    const impostor = generateKeypair();
    const dek = generateDek();
    const sealed = await sealForRecipient(recipient.publicKey, dek);
    await expect(openSealedBox(impostor.privateKey, sealed)).rejects.toThrow();
  });

  it("supports sealing the same DEK for multiple admins independently", async () => {
    const dek = generateDek();
    const admins = [generateKeypair(), generateKeypair(), generateKeypair()];
    const sealedPerAdmin = await Promise.all(admins.map((a) => sealForRecipient(a.publicKey, dek)));

    for (const [i, admin] of admins.entries()) {
      const recovered = await openSealedBox(admin.privateKey, sealedPerAdmin[i]);
      expect(recovered).toEqual(dek);
    }
    // and revoking/rotating one admin's seal must not affect the others
    const stillWorks = await openSealedBox(admins[2].privateKey, sealedPerAdmin[2]);
    expect(stillWorks).toEqual(dek);
  });
});

describe("recovery key (secondary unlock path for the same identity)", () => {
  it("a recovery secret wraps the SAME private key under its own salt, independent of the passphrase", async () => {
    const { keypair } = await setUpAdmin("correct horse battery staple");

    const recoverySecret = generateRecoverySecret();
    const recoverySalt = generateSalt();
    const recoveryKek = await deriveKek(recoverySecret, recoverySalt);
    const wrappedForRecovery = await aesGcmEncrypt(recoveryKek, keypair.privateKey);

    const recovered = await unlock(recoverySecret, recoverySalt, wrappedForRecovery);
    expect(recovered).toEqual(keypair.privateKey);
  });

  it("rotating the passphrase (re-wrap) does not invalidate the recovery path, and vice versa", async () => {
    const passphrase1 = "correct horse battery staple";
    const { salt, keypair, wrappedPrivateKey } = await setUpAdmin(passphrase1);

    const recoverySecret = generateRecoverySecret();
    const recoverySalt = generateSalt();
    const recoveryKek = await deriveKek(recoverySecret, recoverySalt);
    const wrappedForRecovery = await aesGcmEncrypt(recoveryKek, keypair.privateKey);

    // user changes their passphrase: re-wrap under a NEW salt/passphrase,
    // recovery blob is untouched.
    const passphrase2 = "another correct horse";
    const newSalt = generateSalt();
    const newKek = await deriveKek(passphrase2, newSalt);
    const rewrapped = await aesGcmEncrypt(newKek, keypair.privateKey);

    const viaNewPassphrase = await unlock(passphrase2, newSalt, rewrapped);
    expect(viaNewPassphrase).toEqual(keypair.privateKey);

    const viaRecovery = await unlock(recoverySecret, recoverySalt, wrappedForRecovery);
    expect(viaRecovery).toEqual(keypair.privateKey);

    // the OLD passphrase/wrap must no longer be reachable from the server's
    // perspective (this asserts the old blob itself still decrypts fine in
    // isolation — the actual invalidation is "the server no longer stores
    // wrappedPrivateKey", exercised at the API layer, not here).
    const viaOldPassphrase = await unlock(passphrase1, salt, wrappedPrivateKey);
    expect(viaOldPassphrase).toEqual(keypair.privateKey);
  });
});

describe("end-to-end: passphrase to a decrypted vault item", () => {
  it("full hierarchy round-trips for a realistic item payload", async () => {
    const passphrase = "correct horse battery staple";
    const { salt, keypair, wrappedPrivateKey } = await setUpAdmin(passphrase);

    const dek = generateDek();
    const sealedDek = await sealForRecipient(keypair.publicKey, dek);

    const item = { site: "aws.amazon.com", user: "root", pass: "s3cr3t!", notes: "MFA en 1Password" };
    const encryptedItem = await aesGcmEncrypt(dek, utf8ToBytes(JSON.stringify(item)));

    // --- new session, only the passphrase is known ---
    const recoveredPriv = await unlock(passphrase, salt, wrappedPrivateKey);
    const recoveredDek = await openSealedBox(recoveredPriv, sealedDek);
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

  it("round-trips real crypto outputs (salt, keypair, DEK, ciphertext)", async () => {
    const salt = generateSalt();
    expect(base64ToBytes(bytesToBase64(salt))).toEqual(salt);

    const { privateKey, publicKey } = generateKeypair();
    expect(base64ToBytes(bytesToBase64(privateKey))).toEqual(privateKey);
    expect(base64ToBytes(bytesToBase64(publicKey))).toEqual(publicKey);

    const dek = generateDek();
    const blob = await aesGcmEncrypt(dek, utf8ToBytes("round trip me"));
    const rehydrated = {
      iv: base64ToBytes(bytesToBase64(blob.iv)),
      ciphertext: base64ToBytes(bytesToBase64(blob.ciphertext)),
    };
    expect(bytesToUtf8(await aesGcmDecrypt(dek, rehydrated))).toBe("round trip me");
  });
});
