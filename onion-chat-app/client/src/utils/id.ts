const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";

function randomString(length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = "";
  for (const byte of bytes) {
    out += alphabet[byte % alphabet.length];
  }
  return out;
}

export function createRoomId(): string {
  return `${randomString(4)}-${randomString(4)}-${randomString(4)}`;
}

export function createClientId(): string {
  return `c_${randomString(10)}`;
}

export function createMessageId(): string {
  return `m_${randomString(12)}`;
}
