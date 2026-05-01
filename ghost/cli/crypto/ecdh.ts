import { createECDH, type ECDH, webcrypto } from "node:crypto";

const subtle = webcrypto.subtle;

export type SessionKeyPair = {
  ecdh: ECDH;
  publicKeyDerB64: string;
};

export async function createSessionKeyPair(): Promise<SessionKeyPair> {
  const ecdh = createECDH("prime256v1");
  ecdh.generateKeys();

  const publicKeyDer = ecdh.getPublicKey();
  const publicKeyDerB64 = publicKeyDer.toString("base64");

  return {
    ecdh,
    publicKeyDerB64,
  };
}

export function createPeerEcdh(): ReturnType<typeof createECDH> {
  return createECDH("prime256v1");
}

export function deriveSharedSecret(privateKey: ECDH, peerPublicKeyDerB64: string): Buffer {
  const peerPublicKey = Buffer.from(peerPublicKeyDerB64, "base64");
  return privateKey.computeSecret(peerPublicKey);
}

export async function hkdfSha256(secret: Buffer, salt: Buffer, info: Buffer): Promise<Buffer> {
  const key = await subtle.importKey("raw", secret, "HKDF", false, ["deriveBits"]);
  const derivedBits = await subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt,
      info
    },
    key,
    256
  );
  return Buffer.from(derivedBits);
}
