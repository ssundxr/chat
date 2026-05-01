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
    fullUnicode: true
  });

  const header = blessed.box({
    top: 0,
    left: 0,
    right: 0,
    height: 6,
    border: { type: "line" },
    style: {
      border: { fg: "white" },
      fg: "white",
      bg: "black"
    },
    tags: true,
    content: renderHeader(roomId, context.shortFingerprint, blackMambaClient.getPeers(), clientId)
  });

  const stream = blessed.log({
    top: 6,
    left: 0,
    right: 0,
    bottom: 5,
    border: { type: "line" },
    style: {
      border: { fg: "white" },
      fg: "white",
      bg: "black"
    },
    scrollback: 500,
    tags: true,
    alwaysScroll: true,
    mouse: true,
    keys: true
  });

  const footer = blessed.box({
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    tags: true,
    border: { type: "line" },
    style: {
      border: { fg: "white" },
      fg: "white",
      bg: "black"
    },
    content: renderFooter(roomId)
  });

  const input = blessed.textbox({
    bottom: 2,
    left: 0,
    right: 0,
    height: 3,
    inputOnFocus: true,
    border: { type: "line" },
    style: {
      border: { fg: "white" },
      fg: "white",
      bg: "black"
    },
    tags: true,
    label: ` black-mamba@${roomId}:~$ `,
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
    stream.log(`[status] ${message}`);
  });

  blackMambaClient.on("peer_update", (peers) => {
    header.setContent(renderHeader(roomId, context.shortFingerprint, peers, clientId));
    footer.setContent(renderFooter(roomId));
    screen.render();
  });

  blackMambaClient.on("message", (entry) => {
    stream.log(
      `[${new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}] ` +
        `${short(entry.sender)} :: ${entry.text}`
    );
    screen.render();
  });

  blackMambaClient.on("close", () => {
    screen.destroy();
    process.exit(0);
  });

  input.on("submit", async (value) => {
    const message = value.trim();
    if (!message) {
      input.clearValue();
      input.focus();
      return;
    }

    if (message.startsWith("/")) {
      handleLocalCommand(message, stream, header, footer, blackMambaClient, context.shortFingerprint, roomId, clientId);
      input.clearValue();
      input.focus();
      screen.render();
      return;
    }

    const result = await blackMambaClient.sendMessage(message, clientId, true);
    stream.log(`${context.shortFingerprint} :: ${message}`);
    stream.log(`[${result.messageId.slice(0, 8)}] encrypted + relayed`);
    input.clearValue();
    input.focus();
    screen.render();
  });

  stream.log(`[black-mamba] connected to room ${roomId}`);
  stream.log(`type /help for shell commands`);
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
    ? peers.map((peer) => `${short(peer.fingerprint)} ${short(peer.sender)}`).join("  ")
    : "no peers connected";

  return [
    `black-mamba room:${roomId}  pid:${process.pid}  client:${short(clientId)}`,
    `self: ${selfFingerprint}`,
    `peers: ${peerLine}`
  ].join("\n");
}

function renderFooter(roomId: string): string {
  return `commands: /help  /peers  /fingerprint  /clear  /leave   ·   room: ${roomId}`;
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
