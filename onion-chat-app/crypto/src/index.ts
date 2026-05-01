const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

export type CipherEnvelope = {
  nonceB64: string;
  ciphertextB64: string;
};

export async function generateSessionKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    {
      name: "ECDH",
      namedCurve: "P-256"
    },
    true,
    ["deriveKey"]
  );
}

export async function exportPublicJwk(key: CryptoKey): Promise<JsonWebKey> {
  return crypto.subtle.exportKey("jwk", key);
}

export async function importPublicJwk(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    []
  );
}

export async function deriveAesKey(privateKey: CryptoKey, peerPublicKey: CryptoKey): Promise<CryptoKey> {
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

export async function encryptUtf8Message(key: CryptoKey, plaintext: string): Promise<CipherEnvelope> {
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const iv = new Uint8Array(nonce);
  const clear = textEncoder.encode(plaintext);
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, clear);

  return {
    nonceB64: bytesToBase64(nonce),
    ciphertextB64: bytesToBase64(new Uint8Array(encrypted))
  };
}

export async function decryptUtf8Message(key: CryptoKey, envelope: CipherEnvelope): Promise<string> {
  const nonce = base64ToBytes(envelope.nonceB64);
  const iv = new Uint8Array(nonce);
  const ciphertext = base64ToBytes(envelope.ciphertextB64);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, new Uint8Array(ciphertext));
  return textDecoder.decode(decrypted);
}
