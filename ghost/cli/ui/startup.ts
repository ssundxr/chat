import { setTimeout as delay } from "node:timers/promises";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createSessionKeyPair } from "../crypto/ecdh.js";
import { sha256Fingerprint, shortFingerprint } from "../crypto/fingerprint.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export type StartupContext = {
  session: Awaited<ReturnType<typeof createSessionKeyPair>>;
  fingerprint: string;
  shortFingerprint: string;
};

const LOGO_FALLBACK = String.raw`┌───────────────────────────────┐
│   G H O S T                   │
│   ██████████████              │
│   █░░░░░░░░░░░░█              │
│   █░░░░░░░░░░░░█              │
│   ██████████████              │
└───────────────────────────────┘`;

const BOOT_LINES = [
  "[ OK ] Initializing black mamba runtime...",
  "[ OK ] Generating ephemeral ECDH keypair (P-256)...",
  "[ OK ] Cryptographic entropy verified...",
  "[ OK ] WebSocket relay connector ready...",
  "[ OK ] No identity stored. No logs. No trace.",
  "[ black mamba ] System armed. You are anonymous."
];

function green(text: string): string {
  // Monochrome: return text as-is (no ANSI colors)
  return text;
}

function loadLogo(): string {
  const candidates = [
    path.resolve(process.cwd(), "logo.txt"),
    path.resolve(__dirname, "../../../logo.txt")
  ];

  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        return fs.readFileSync(p, "utf8");
      }
    } catch (e) {
      // ignore and try next
    }
  }

  return LOGO_FALLBACK;
}

export async function startup(): Promise<StartupContext> {
  process.stdout.write("\u001Bc");
  const logo = loadLogo();
  process.stdout.write(`${logo}\n`);
  process.stdout.write(`black mamba v1.0.7  terminal-native · end-to-end encrypted · ephemeral\n`);
  process.stdout.write(`└─ shell mode: armed | transport: relay | crypto: ECDH + AES-GCM\n\n`);

  let session: Awaited<ReturnType<typeof createSessionKeyPair>> | undefined;

  for (const line of BOOT_LINES) {
    if (line.includes("Generating ephemeral ECDH keypair")) {
      session = await createSessionKeyPair();
    }

    process.stdout.write(`${line}\n`);
    const jitter = 80 + Math.floor(Math.random() * 71);
    await delay(jitter);
  }

  if (!session) {
    session = await createSessionKeyPair();
  }

  const fingerprint = sha256Fingerprint(session.publicKeyDerB64);
  const short = shortFingerprint(fingerprint);
  process.stdout.write(`\nSession fingerprint: ${short}\n`);

  return {
    session,
    fingerprint,
    shortFingerprint: short
  };
}
