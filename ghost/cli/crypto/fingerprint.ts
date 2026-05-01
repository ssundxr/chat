import { createHash } from "node:crypto";

export function sha256Fingerprint(publicKeyDerB64: string): string {
  return createHash("sha256").update(Buffer.from(publicKeyDerB64, "base64")).digest("hex");
}

export function shortFingerprint(fingerprintHex: string): string {
  return fingerprintHex.slice(0, 16).toUpperCase();
}
