const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export type EncryptedPayload = {
  nonceB64: string;
  ciphertextB64: string;
};

export async function generateEcdhKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    {
      name: "ECDH",
      namedCurve: "P-256"
    },
    true,
    ["deriveKey"]
  );
}

export async function exportPublicKeyJwk(publicKey: CryptoKey): Promise<JsonWebKey> {
  return crypto.subtle.exportKey("jwk", publicKey);
}

export async function importPublicKeyJwk(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    {
      name: "ECDH",
      namedCurve: "P-256"
    },
    true,
    []
  );
}

export async function derivePeerAesKey(privateKey: CryptoKey, peerPublicKey: CryptoKey): Promise<CryptoKey> {
  return crypto.subtle.deriveKey(
    {
      name: "ECDH",
      public: peerPublicKey
    },
    privateKey,
    {
      name: "AES-GCM",
      length: 256
    },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptMessage(aesKey: CryptoKey, plaintext: string): Promise<EncryptedPayload> {
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const iv = new Uint8Array(nonce);
  const clearBytes = textEncoder.encode(plaintext);
  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv
    },
    aesKey,
    clearBytes
  );

  return {
    nonceB64: bytesToBase64(nonce),
    ciphertextB64: bytesToBase64(new Uint8Array(encryptedBuffer))
  };
}

export async function decryptMessage(aesKey: CryptoKey, payload: EncryptedPayload): Promise<string> {
  const nonce = base64ToBytes(payload.nonceB64);
  const iv = new Uint8Array(nonce);
  const ciphertext = base64ToBytes(payload.ciphertextB64);
  const clearBuffer = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv
    },
    aesKey,
    new Uint8Array(ciphertext)
  );

  return textDecoder.decode(clearBuffer);
}
