import blessed from "blessed";
import { randomUUID } from "node:crypto";
import type { StartupContext } from "./startup.js";
import { BlackMambaWsClient } from "../network/ws-client.js";

export type ChatOptions = {
  ghost?: boolean;
  burnAfterRead?: boolean;
};

const GHOST_TTL_MS = 10 * 60 * 1000;

export async function runChat(roomId: string, context: StartupContext, clientId: string, options: ChatOptions = {}): Promise<void> {
  const isGhost = options.ghost ?? roomId.startsWith("G-");
  const burnAfterRead = options.burnAfterRead ?? isGhost;

  const blackMambaClient = new BlackMambaWsClient(roomId, context);

  if (context.torEnabled) {
    try {
      const { SocksProxyAgent } = await import("socks-proxy-agent");
      const agent = new SocksProxyAgent(context.torProxy);
      blackMambaClient.setProxyAgent(agent);
    } catch {
      // socks-proxy-agent not installed — proceed without
    }
  }

  await blackMambaClient.connect(clientId);

  let ghostExpiresAt = isGhost ? Date.now() + GHOST_TTL_MS : null;

  const borderColor = isGhost ? "#FF6600" : "#0066CC";
  const accentColor = isGhost ? "#FF6600" : "#00FF41";
  const dimColor = "#C74634";

  const screen = blessed.screen({
    smartCSR: false,
    title: isGhost ? `[GHOST] black-mamba :: ${roomId}` : `black-mamba :: ${roomId}`,
    fullUnicode: true,
    dockBorders: true,
    terminal: "ansi"
  });

  const header = blessed.box({
    top: 0,
    left: 0,
    right: 0,
    height: 6,
    border: { type: "line" },
    style: {
      border: { fg: borderColor },
      fg: accentColor,
      bg: "black"
    },
    tags: true,
    content: renderHeader(roomId, context.shortFingerprint, blackMambaClient.getPeers(), clientId, isGhost, ghostExpiresAt, context)
  });

  const stream = blessed.log({
    top: 6,
    left: 0,
    right: 0,
    bottom: 5,
    border: { type: "line" },
    style: {
      border: { fg: borderColor },
      fg: "#E0E0E0",
      bg: "black"
    },
    scrollback: 2000,
    tags: true,
    alwaysScroll: true,
    mouse: false,
    keys: true,
    scrollbar: {
      ch: "▐",
      track: { bg: "black" },
      style: { inverse: true }
    }
  });

  const footer = blessed.box({
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    tags: true,
    border: { type: "line" },
    style: {
      border: { fg: borderColor },
      fg: dimColor,
      bg: "black"
    },
    content: renderFooter(isGhost)
  });

  const input = blessed.textbox({
    bottom: 3,
    left: 0,
    right: 0,
    height: 3,
    mouse: false,
    inputOnFocus: false,
    border: { type: "line" },
    style: {
      border: { fg: borderColor },
      fg: accentColor,
      bg: "black",
      focus: { border: { fg: isGhost ? "red" : "cyan" } }
    },
    tags: true,
    label: isGhost
      ? ` {bold}{red-fg}ghost{/red-fg}{/bold}@{bold}mamba{/bold}:${roomId}# `
      : ` {bold}onion{/bold}@{bold}mamba{/bold}:${roomId}# `,
    value: ""
  });

  screen.append(header);
  screen.append(stream);
  screen.append(footer);
  screen.append(input);

  screen.key(["C-c"], () => {
    blackMambaClient.leave(clientId);
    if (ghostCountdown) clearInterval(ghostCountdown);
    screen.destroy();
    process.exit(0);
  });

  blackMambaClient.on("status", (message) => {
    stream.log(`{${borderColor}-fg}[sys]{/${borderColor}-fg} ${message}`);
    screen.render();
  });

  blackMambaClient.on("peer_update", (peers) => {
    header.setContent(renderHeader(roomId, context.shortFingerprint, peers, clientId, isGhost, ghostExpiresAt, context));
    screen.render();
  });

  blackMambaClient.on("message", (entry) => {
    const time = new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    stream.log(
      `{${dimColor}-fg}${time}{/${dimColor}-fg} {bold}{${accentColor}-fg}${short(entry.sender)}{/${accentColor}-fg}{/bold} {${borderColor}-fg}▶{/${borderColor}-fg} ${entry.text}`
    );
    screen.render();
  });

  blackMambaClient.on("burn", () => {
    stream.setContent("");
    stream.log(`{red-fg}╔══════════════════════════════════════╗{/red-fg}`);
    stream.log(`{red-fg}║  ██████╗ ██╗   ██╗██████╗ ███╗  ██╗ ║{/red-fg}`);
    stream.log(`{red-fg}║  ██╔══██╗██║   ██║██╔══██╗████╗ ██║ ║{/red-fg}`);
    stream.log(`{red-fg}║  ██████╔╝██║   ██║██████╔╝██╔██╗██║ ║{/red-fg}`);
    stream.log(`{red-fg}║  ██╔══██╗██║   ██║██╔══██╗██║╚████║ ║{/red-fg}`);
    stream.log(`{red-fg}║  ██████╔╝╚██████╔╝██║  ██║██║ ╚███║ ║{/red-fg}`);
    stream.log(`{red-fg}╚══════════════════════════════════════╝{/red-fg}`);
    stream.log(`{red-fg}  ALL MESSAGES INCINERATED. NO TRACE.{/red-fg}`);
    screen.render();
  });

  blackMambaClient.on("ghost_expires_at", (ts) => {
    ghostExpiresAt = ts;
    header.setContent(renderHeader(roomId, context.shortFingerprint, blackMambaClient.getPeers(), clientId, isGhost, ghostExpiresAt, context));
    screen.render();
  });

  blackMambaClient.on("close", () => {
    if (ghostCountdown) clearInterval(ghostCountdown);
    screen.destroy();
    process.exit(0);
  });

  let ghostCountdown: ReturnType<typeof setInterval> | null = null;
  if (isGhost && ghostExpiresAt !== null) {
    ghostCountdown = setInterval(() => {
      const remaining = (ghostExpiresAt ?? 0) - Date.now();
      if (remaining <= 0) {
        clearInterval(ghostCountdown!);
        stream.log(`{red-fg}[GHOST]{/red-fg} {bold}ROOM SELF-DESTRUCTED{/bold} — session terminated. no trace.`);
        screen.render();
        setTimeout(() => {
          blackMambaClient.leave(clientId);
          screen.destroy();
          process.exit(0);
        }, 2000);
        return;
      }
      header.setContent(renderHeader(roomId, context.shortFingerprint, blackMambaClient.getPeers(), clientId, isGhost, ghostExpiresAt, context));
      screen.render();
    }, 1000);
  }

  const submitMessage = async (value: string) => {
    const message = value.trim();
    if (!message) {
      input.setValue("");
      input.focus();
      screen.render();
      return;
    }

    if (message.startsWith("/")) {
      handleLocalCommand(message, stream, header, footer, blackMambaClient, context.shortFingerprint, roomId, clientId, isGhost, ghostExpiresAt, context);
      input.setValue("");
      input.focus();
      screen.render();
      return;
    }

    const result = await blackMambaClient.sendMessage(message, clientId, burnAfterRead);
    stream.log(
      `{${dimColor}-fg}you{/${dimColor}-fg} {${borderColor}-fg}▶{/${borderColor}-fg} ${message} {black-fg}{${accentColor}-bg} ✓ {/${accentColor}-bg}{/black-fg} {#888888-fg}${result.messageId.slice(0, 8)}{/#888888-fg}`
    );
    input.setValue("");
    input.focus();
    screen.render();
  };

  let lastKeyTime = 0;
  let lastChar = "";

  screen.on("keypress", (ch, key) => {
    if (screen.focused !== input) return;

    const now = Date.now();
    if (ch && ch === lastChar && (now - lastKeyTime) < 30) {
      return;
    }
    lastChar = ch || "";
    lastKeyTime = now;

    if (key.name === "enter" || key.name === "return") {
      const val = input.getValue();
      submitMessage(val);
      return;
    }

    if (key.name === "backspace") {
      const val = input.getValue();
      if (val.length > 0) {
        input.setValue(val.slice(0, -1));
        screen.render();
      }
      return;
    }

    if (ch && ch.length === 1 && !key.ctrl && !key.meta) {
      const val = input.getValue();
      input.setValue(val + ch);
      screen.render();
    }
  });

  const torTag = context.torEnabled ? ` {#FF6600-fg}[TOR]{/#FF6600-fg}` : "";
  stream.log(`{${borderColor}-fg}[boot]{/${borderColor}-fg} channel open :: ${roomId}${torTag}`);
  stream.log(`{${borderColor}-fg}[boot]{/${borderColor}-fg} encryption :: AES-256-GCM + ECDH P-256`);
  if (isGhost) {
    stream.log(`{red-fg}[GHOST]{/red-fg} self-destruct armed :: 10:00 remaining`);
    stream.log(`{red-fg}[GHOST]{/red-fg} all messages burn after read`);
  }
  stream.log(`{#888888-fg}type /help for commands{/#888888-fg}`);
  screen.render();
  input.focus();
}

function formatCountdown(ms: number): string {
  const totalSecs = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSecs / 60).toString().padStart(2, "0");
  const s = (totalSecs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function renderHeader(
  roomId: string,
  selfFingerprint: string,
  peers: { sender: string; fingerprint: string }[],
  clientId: string,
  isGhost: boolean,
  ghostExpiresAt: number | null,
  context: StartupContext
): string {
  const bc = isGhost ? "#FF6600" : "#0066CC";
  const ac = isGhost ? "#FF6600" : "#00FF41";

  const peerLine = peers.length > 0
    ? peers.map((p) => `{${ac}-fg}${short(p.fingerprint)}{/${ac}-fg}`).join("  ")
    : `{#888888-fg}awaiting peers{/#888888-fg}`;

  const torBadge = context.torEnabled ? ` {#FF6600-fg}[TOR]{/#FF6600-fg}` : "";
  const ghostBadge = isGhost ? ` {red-fg}[GHOST]{/red-fg}` : "";
  const statusLabel = isGhost ? `{red-fg}GHOST{/red-fg}` : `{${ac}-fg}ACTIVE{/${ac}-fg}`;

  const countdownLine = isGhost && ghostExpiresAt !== null
    ? ` {red-fg}SELF-DESTRUCT:{/red-fg} {bold}${formatCountdown(ghostExpiresAt - Date.now())}{/bold}`
    : "";

  return [
    ` {bold}BLACK-MAMBA v1.2.5{/bold}${torBadge}${ghostBadge} | STATUS: ${statusLabel}`,
    ` ROOM: {bold}{${bc}-fg}${roomId}{/${bc}-fg}{/bold} | NODE: {${ac}-fg}${short(clientId)}{/${ac}-fg}${countdownLine}`,
    ` SELF: {${ac}-fg}${selfFingerprint}{/${ac}-fg}`,
    ` PEERS: ${peerLine}`
  ].join("\n");
}

function renderFooter(isGhost: boolean): string {
  if (isGhost) {
    return ` {bold}CMD:{/bold} /help  /peers  /link  /burn  /leave  |  {red-fg}◈ GHOST CHANNEL{/red-fg}`;
  }
  return ` {bold}CMD:{/bold} /help  /peers  /link  /burn  /leave  |  {#00FF41-fg}● SECURE CHANNEL{/#00FF41-fg}`;
}

function handleLocalCommand(
  command: string,
  stream: any,
  header: blessed.Widgets.BoxElement,
  footer: blessed.Widgets.BoxElement,
  blackMambaClient: BlackMambaWsClient,
  fingerprint: string,
  roomId: string,
  clientId: string,
  isGhost: boolean,
  ghostExpiresAt: number | null,
  context: StartupContext
): void {
  const [name] = command.split(/\s+/, 1);

  switch (name) {
    case "/help":
      stream.log(`{#888888-fg}commands: /help /peers /fingerprint /clear /burn /link /leave{/#888888-fg}`);
      if (isGhost) {
        stream.log(`{red-fg}/burn{/red-fg} {#888888-fg}— incinerate all messages for all peers{/#888888-fg}`);
      }
      return;
    case "/peers": {
      const peers = blackMambaClient.getPeers();
      stream.log(`{#888888-fg}peers online: ${peers.length}{/#888888-fg}`);
      for (const peer of peers) {
        stream.log(`  {#00FF41-fg}◈{/#00FF41-fg} ${short(peer.fingerprint)}  ${short(peer.sender)}`);
      }
      return;
    }
    case "/fingerprint":
      stream.log(`{#888888-fg}self fingerprint:{/#888888-fg} ${fingerprint}`);
      return;
    case "/clear":
      stream.setContent("");
      header.setContent(renderHeader(roomId, fingerprint, blackMambaClient.getPeers(), clientId, isGhost, ghostExpiresAt, context));
      footer.setContent(renderFooter(isGhost));
      stream.log(`{#888888-fg}screen cleared{/#888888-fg}`);
      return;
    case "/burn":
      blackMambaClient.sendBurn();
      stream.setContent("");
      stream.log(`{red-fg}╔══════════════════════════════════════╗{/red-fg}`);
      stream.log(`{red-fg}║  ██████╗ ██╗   ██╗██████╗ ███╗  ██╗ ║{/red-fg}`);
      stream.log(`{red-fg}║  ██╔══██╗██║   ██║██╔══██╗████╗ ██║ ║{/red-fg}`);
      stream.log(`{red-fg}║  ██████╔╝██║   ██║██████╔╝██╔██╗██║ ║{/red-fg}`);
      stream.log(`{red-fg}║  ██╔══██╗██║   ██║██╔══██╗██║╚████║ ║{/red-fg}`);
      stream.log(`{red-fg}║  ██████╔╝╚██████╔╝██║  ██║██║ ╚███║ ║{/red-fg}`);
      stream.log(`{red-fg}╚══════════════════════════════════════╝{/red-fg}`);
      stream.log(`{red-fg}  ALL MESSAGES INCINERATED. NO TRACE.{/red-fg}`);
      return;
    case "/link": {
      const webUrl = process.env.BLACK_MAMBA_WEB_URL ?? "https://onionblackmamba.duckdns.org";
      const route = isGhost ? "ghost" : "join";
      const link = `${webUrl}/${route}/${roomId}`;
      stream.log(`{#00FF41-fg}◈ SHARE LINK{/#00FF41-fg}`);
      stream.log(`  {bold}${link}{/bold}`);
      stream.log(`{#888888-fg}  anyone with this link can join via browser — no install required{/#888888-fg}`);
      return;
    }
    case "/leave":
      blackMambaClient.leave(clientId);
      return;
    default:
      stream.log(`{#888888-fg}unknown: ${command}{/#888888-fg}`);
  }
}

function short(value: string): string {
  return value.slice(0, 12).toUpperCase();
}
