import blessed from "blessed";
import { randomUUID } from "node:crypto";
import type { StartupContext } from "./startup.js";
import { BlackMambaWsClient } from "../network/ws-client.js";

export async function runChat(roomId: string, context: StartupContext, clientId: string): Promise<void> {
  const blackMambaClient = new BlackMambaWsClient(roomId, context);
  await blackMambaClient.connect(clientId);

  const screen = blessed.screen({
    smartCSR: false,
    title: `black-mamba :: ${roomId}`,
    fullUnicode: true,
    dockBorders: true,
    terminal: "ansi"
  });

  const header = blessed.box({
    top: 0,
    left: 0,
    right: 0,
    height: 7,
    border: { type: "line" },
    style: {
      border: { fg: "blue" },
      fg: "red",
      bg: "black"
    },
    tags: true,
    content: renderHeader(roomId, context.shortFingerprint, blackMambaClient.getPeers(), clientId)
  });

  const stream = blessed.log({
    top: 7,
    left: 0,
    right: 0,
    bottom: 5,
    border: { type: "line" },
    style: {
      border: { fg: "blue" },
      fg: "red",
      bg: "black"
    },
    scrollback: 1000,
    tags: true,
    alwaysScroll: true,
    mouse: true,
    keys: true,
    scrollbar: {
      ch: " ",
      track: {
        bg: "black"
      },
      style: {
        inverse: true
      }
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
      border: { fg: "blue" },
      fg: "red",
      bg: "black"
    },
    content: renderFooter(roomId)
  });

  const input = blessed.textbox({
    bottom: 3,
    left: 0,
    right: 0,
    height: 3,
    mouse: true,
    inputOnFocus: false,
    border: { type: "line" },
    style: {
      border: { fg: "blue" },
      fg: "red",
      bg: "black",
      focus: {
        border: { fg: "red" }
      }
    },
    tags: true,
    label: ` {bold}onion@mamba{/bold}:${roomId}# `,
    value: ""
  });

  screen.append(header);
  screen.append(stream);
  screen.append(footer);
  screen.append(input);
  screen.key(["C-c"], () => {
    blackMambaClient.leave(clientId);
    screen.destroy();
    process.exit(0);
  });

  blackMambaClient.on("status", (message) => {
    stream.log(`{blue-fg}[system]{/blue-fg} ${message}`);
  });

  blackMambaClient.on("peer_update", (peers) => {
    header.setContent(renderHeader(roomId, context.shortFingerprint, peers, clientId));
    footer.setContent(renderFooter(roomId));
    screen.render();
  });

  blackMambaClient.on("message", (entry) => {
    const time = new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    stream.log(
      `{red-fg}[${time}]{/red-fg} {bold}${short(entry.sender)}{/bold} {blue-fg}:: {/blue-fg}${entry.text}`
    );
    screen.render();
  });

  blackMambaClient.on("close", () => {
    screen.destroy();
    process.exit(0);
  });

  const submitMessage = async (value: string) => {
    const message = value.trim();
    if (!message) {
      input.setValue("");
      input.focus();
      screen.render();
      return;
    }

    if (message.startsWith("/")) {
      handleLocalCommand(message, stream, header, footer, blackMambaClient, context.shortFingerprint, roomId, clientId);
      input.setValue("");
      input.focus();
      screen.render();
      return;
    }

    const result = await blackMambaClient.sendMessage(message, clientId, true);
    stream.log(`{red-fg}${context.shortFingerprint}{/red-fg} {blue-fg}>>{/blue-fg} ${message}`);
    stream.log(`{black-fg}{white-bg} SENT {/white-bg}{/black-fg} ID: ${result.messageId.slice(0, 8)} [encrypted]`);
    input.setValue("");
    input.focus();
    screen.render();
  };

  let lastKeyTime = 0;
  let lastChar = "";

  screen.on("keypress", (ch, key) => {
    if (screen.focused !== input) return;

    // Debounce rapid duplicate characters (common on some Windows terminals)
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

  stream.log(`{red-fg}[boot]{/red-fg} node established :: room ${roomId}`);
  stream.log(`{red-fg}[boot]{/red-fg} crypto initialized :: AES-256-GCM`);
  stream.log(`{red-fg}[boot]{/red-fg} type {bold}/help{/bold} for command matrix`);
  screen.render();
  input.focus();
}

function renderHeader(
  roomId: string,
  selfFingerprint: string,
  peers: { sender: string; fingerprint: string }[],
  clientId: string
): string {
  const peerLine = peers.length > 0
    ? peers.map((peer) => `{blue-fg}${short(peer.fingerprint)}{/blue-fg}`).join("  ")
    : "{red-fg}no active peers{/red-fg}";

  return [
    ` {bold}ONION-CHAT PROTOCOL v1.1{/bold} | {green-fg}STATUS: ACTIVE{/green-fg}`,
    ` ROOM ID: {bold}${roomId}{/bold} | PID: ${process.pid} | NODE: ${short(clientId)}`,
    ` SELF-HASH: {blue-fg}${selfFingerprint}{/blue-fg}`,
    ` PEER MATRIX: ${peerLine}`
  ].join("\n");
}

function renderFooter(roomId: string): string {
  return ` {bold}CMD:{/bold} /help  /peers  /fingerprint  /clear  /leave  |  {blue-fg}● SECURE CHANNEL{/blue-fg}`;
}

function handleLocalCommand(
  command: string,
  stream: any,
  header: blessed.Widgets.BoxElement,
  footer: blessed.Widgets.BoxElement,
  blackMambaClient: BlackMambaWsClient,
  fingerprint: string,
  roomId: string,
  clientId: string
): void {
  const [name] = command.split(/\s+/, 1);

  switch (name) {
    case "/help":
      stream.log(`help /help /peers /fingerprint /clear /leave`);
      return;
    case "/peers": {
      const peers = blackMambaClient.getPeers();
      stream.log(`peers: ${peers.length}`);
      for (const peer of peers) {
        stream.log(`  ${short(peer.fingerprint)}  ${short(peer.sender)}`);
      }
      return;
    }
    case "/fingerprint":
      stream.log(`self: ${fingerprint}`);
      return;
    case "/clear":
      stream.clear();
      header.setContent(renderHeader(roomId, fingerprint, blackMambaClient.getPeers(), clientId));
      footer.setContent(renderFooter(roomId));
      stream.log(`screen cleared`);
      return;
    case "/leave":
      blackMambaClient.leave(clientId);
      return;
    default:
      stream.log(`unknown command: ${command}`);
  }
}

function short(value: string): string {
  return value.slice(0, 12).toUpperCase();
}
