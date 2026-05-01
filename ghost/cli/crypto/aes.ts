import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export type AesEnvelope = {
  ivB64: string;
  ciphertextB64: string;
  authTagB64: string;
};

export function encryptAes256Gcm(key: Buffer, plaintext: string, aad?: Buffer): AesEnvelope {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  if (aad) {
    cipher.setAAD(aad);
  }

  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    ivB64: iv.toString("base64"),
    ciphertextB64: ciphertext.toString("base64"),
    authTagB64: authTag.toString("base64")
  };
}

export function decryptAes256Gcm(key: Buffer, envelope: AesEnvelope, aad?: Buffer): string {
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(envelope.ivB64, "base64"));

  if (aad) {
    decipher.setAAD(aad);
  }

  decipher.setAuthTag(Buffer.from(envelope.authTagB64, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(envelope.ciphertextB64, "base64")),
    decipher.final()
  ]);

  return plaintext.toString("utf8");
}
