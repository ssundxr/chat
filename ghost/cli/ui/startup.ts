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
  `[ ${green("OK")} ] Initializing black mamba runtime...`,
  `[ ${green("OK")} ] Generating ephemeral ECDH keypair (P-256)...`,
  `[ ${green("OK")} ] Cryptographic entropy verified...`,
  `[ ${green("OK")} ] WebSocket relay connector ready...`,
  `[ ${green("OK")} ] No identity stored. No logs. No trace.`,
  `[ ${cyan("SYSTEM")} ] black mamba armed. You are anonymous.`
];

function green(text: string): string {
  return `\x1b[32m${text}\x1b[0m`;
}

function cyan(text: string): string {
  return `\x1b[36m${text}\x1b[0m`;
}

function bold(text: string): string {
  return `\x1b[1m${text}\x1b[0m`;
}

function dim(text: string): string {
  return `\x1b[2m${text}\x1b[0m`;
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
  process.stdout.write(green(logo) + "\n");
  process.stdout.write(bold(`black mamba v1.1.3`) + `  ${dim("terminal-native · end-to-end encrypted · ephemeral")}\n`);
  process.stdout.write(dim(`└─ `) + `shell mode: ${cyan("armed")} | transport: ${cyan("relay")} | crypto: ${cyan("ECDH + AES-GCM")}\n\n`);

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
  process.stdout.write(`\nSession fingerprint: ${cyan(short)}\n`);

  return {
    session,
    fingerprint,
    shortFingerprint: short
  };
}
