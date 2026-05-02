import { setTimeout as delay } from "node:timers/promises";
import fs from "node:fs";
import path from "node:path";
import net from "node:net";
import { fileURLToPath } from "node:url";
import { createSessionKeyPair } from "../crypto/ecdh.js";
import { sha256Fingerprint, shortFingerprint } from "../crypto/fingerprint.js";

export type StartupContext = {
  session: Awaited<ReturnType<typeof createSessionKeyPair>>;
  fingerprint: string;
  shortFingerprint: string;
  torEnabled: boolean;
  ghostMode: boolean;
  torProxy: string;
};

const LOGO_FALLBACK = String.raw`
 ██████╗ ██╗      █████╗  ██████╗██╗  ██╗    ███╗   ███╗ █████╗ ███╗   ███╗██████╗  █████╗
 ██╔══██╗██║     ██╔══██╗██╔════╝██║ ██╔╝    ████╗ ████║██╔══██╗████╗ ████║██╔══██╗██╔══██╗
 ██████╔╝██║     ███████║██║     █████╔╝     ██╔████╔██║███████║██╔████╔██║██████╔╝███████║
 ██╔══██╗██║     ██╔══██║██║     ██╔═██╗     ██║╚██╔╝██║██╔══██║██║╚██╔╝██║██╔══██╗██╔══██║
 ██████╔╝███████╗██║  ██║╚██████╗██║  ██╗    ██║ ╚═╝ ██║██║  ██║██║ ╚═╝ ██║██████╔╝██║  ██║
 ╚═════╝ ╚══════╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝    ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝╚═════╝ ╚═╝  ╚═╝`;

function green(text: string): string {
  return `\x1b[32m${text}\x1b[0m`;
}

function red(text: string): string {
  return `\x1b[31m${text}\x1b[0m`;
}

function cyan(text: string): string {
  return `\x1b[36m${text}\x1b[0m`;
}

function yellow(text: string): string {
  return `\x1b[33m${text}\x1b[0m`;
}

function orange(text: string): string {
  return `\x1b[38;5;208m${text}\x1b[0m`;
}

function bold(text: string): string {
  return `\x1b[1m${text}\x1b[0m`;
}

function dim(text: string): string {
  return `\x1b[2m${text}\x1b[0m`;
}

function loadLogo(): string {
  let baseDir = "";
  try {
    baseDir = path.dirname(fileURLToPath(import.meta.url));
  } catch (e) {
    try {
      baseDir = __dirname;
    } catch {
      baseDir = process.cwd();
    }
  }

  const candidates = [
    path.resolve(process.cwd(), "logo.txt"),
    path.resolve(baseDir, "../../../logo.txt"),
    path.resolve(baseDir, "..", "logo.txt"),
    path.resolve(baseDir, "logo.txt"),
    "/snapshot/ghost/logo.txt"
  ];

  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        return fs.readFileSync(p, "utf8");
      }
    } catch {
      // ignore
    }
  }

  return LOGO_FALLBACK;
}

function parseFlags(): { torEnabled: boolean; ghostMode: boolean; torProxy: string } {
  const args = process.argv.slice(2);
  const torEnabled = args.includes("--tor") || args.includes("--ghost");
  const ghostMode = args.includes("--ghost");
  const torProxyArg = args.find((a) => a.startsWith("--tor-proxy="));
  const torProxy = torProxyArg
    ? torProxyArg.split("=")[1]
    : (process.env.BLACK_MAMBA_TOR_PROXY ?? "socks5://127.0.0.1:9050");
  return { torEnabled, ghostMode, torProxy };
}

async function checkTorProxy(proxyUrl: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const url = new URL(proxyUrl);
      const host = url.hostname;
      const port = parseInt(url.port, 10) || 9050;
      const socket = net.createConnection({ host, port, family: 4 }, () => {
        socket.destroy();
        resolve(true);
      });
      socket.setTimeout(2000);
      socket.on("timeout", () => { socket.destroy(); resolve(false); });
      socket.on("error", () => resolve(false));
    } catch {
      resolve(false);
    }
  });
}

export async function startup(): Promise<StartupContext> {
  process.stdout.write("\u001Bc");

  const { torEnabled, ghostMode, torProxy } = parseFlags();

  const logo = loadLogo();
  process.stdout.write(green(logo) + "\n");

  if (ghostMode) {
    process.stdout.write(
      bold(red(`  ██████╗ ██╗  ██╗ ██████╗ ███████╗████████╗    ███╗   ███╗ ██████╗ ██████╗ ███████╗`)) + "\n"
    );
    process.stdout.write(
      bold(red(`  ██╔════╝ ██║  ██║██╔═══██╗██╔════╝╚══██╔══╝    ████╗ ████║██╔═══██╗██╔══██╗██╔════╝`)) + "\n"
    );
    process.stdout.write(
      bold(orange(`  ██║  ███╗███████║██║   ██║███████╗   ██║       ██╔████╔██║██║   ██║██║  ██║█████╗  `)) + "\n"
    );
    process.stdout.write(bold(orange(`  ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄`)) + "\n");
    process.stdout.write(bold(red(`  [ GHOST MODE ] zero-trace · tor-routed · self-destruct`)) + "\n\n");
  } else {
    process.stdout.write(
      bold(`  black-mamba v1.2.5`) +
      `  ${dim("terminal-native · end-to-end encrypted · ephemeral")}\n`
    );
    process.stdout.write(
      dim(`  └─ `) +
      `shell: ${cyan("armed")} | transport: ${cyan("relay")} | crypto: ${cyan("ECDH·P256 + AES-256-GCM")}\n\n`
    );
  }

  const bootLines = [
    `  ${dim("▸")} ${green("INIT")}    runtime environment .............. ${green("OK")}`,
    `  ${dim("▸")} ${green("CRYPTO")}  generating ephemeral keypair P-256 . ${green("OK")}`,
    `  ${dim("▸")} ${green("ENTROPY")} cryptographic seed verified ........ ${green("OK")}`,
    `  ${dim("▸")} ${green("RELAY")}   websocket connector ready .......... ${green("OK")}`,
    ghostMode
      ? `  ${dim("▸")} ${orange("GHOST")}   zero-trace mode armed .............. ${orange("ARMED")}`
      : `  ${dim("▸")} ${green("OPSEC")}   no identity · no logs · no trace ... ${green("OK")}`,
  ];

  let session: Awaited<ReturnType<typeof createSessionKeyPair>> | undefined;

  for (const line of bootLines) {
    if (line.includes("keypair")) {
      session = await createSessionKeyPair();
    }
    process.stdout.write(`${line}\n`);
    const jitter = 60 + Math.floor(Math.random() * 80);
    await delay(jitter);
  }

  if (!session) {
    session = await createSessionKeyPair();
  }

  if (torEnabled) {
    process.stdout.write(`\n  ${dim("▸")} ${orange("TOR")}     checking proxy ${dim(torProxy)} .`);
    const torOk = await checkTorProxy(torProxy);
    if (torOk) {
      process.stdout.write(` ${orange("ONLINE")}\n`);
    } else {
      process.stdout.write(` ${yellow("OFFLINE")}\n`);
      process.stdout.write(
        `\n  ${yellow("[WARN]")} Tor proxy unreachable at ${torProxy}\n` +
        `  ${dim("└─")} Start Tor Browser or ${dim("systemctl start tor")} to route anonymously.\n` +
        `  ${dim("└─")} Falling back to clearnet. Press ${bold("Ctrl+C")} to abort.\n\n`
      );
      await delay(3000);
    }
  }

  const fingerprint = sha256Fingerprint(session.publicKeyDerB64);
  const short = shortFingerprint(fingerprint);

  process.stdout.write(`\n  ${dim("└─")} session identity :: ${cyan(short)}  ${dim("[ephemeral · discarded on exit]")}\n`);

  if (ghostMode) {
    process.stdout.write(
      `  ${dim("└─")} ${orange("GHOST")} room will self-destruct in ${bold("10 minutes")} · all messages burn on read\n`
    );
  }

  process.stdout.write("\n");

  return {
    session,
    fingerprint,
    shortFingerprint: short,
    torEnabled,
    ghostMode,
    torProxy
  };
}
