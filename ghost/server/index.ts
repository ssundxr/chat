import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { WebSocketServer } from "ws";
import { RoomManager } from "./room-manager.js";
import { registerRelayHandlers } from "./relay.js";

const PORT = Number(process.env.BLACK_MAMBA_PORT ?? 8090);
const HOST = process.env.BLACK_MAMBA_HOST ?? "0.0.0.0";
const MAX_ROOMS = Number(process.env.BLACK_MAMBA_MAX_ROOMS ?? 500);
const MAX_ROOM_SIZE = Number(process.env.BLACK_MAMBA_MAX_ROOM_SIZE ?? 10);
const TTL_MS = Number(process.env.BLACK_MAMBA_TTL_MS ?? 10 * 60 * 1000);
const MAX_PAYLOAD_BYTES = Number(process.env.BLACK_MAMBA_MAX_PAYLOAD_BYTES ?? 64 * 1024);
const MAX_MESSAGES_PER_SECOND = Number(process.env.BLACK_MAMBA_MAX_MESSAGES_PER_SECOND ?? 10);
const WEB_URL = process.env.BLACK_MAMBA_WEB_URL ?? `http://ec2-13-53-212-66.eu-north-1.compute.amazonaws.com:${PORT}`;

const roomManager = new RoomManager({
  maxRooms: MAX_ROOMS,
  maxRoomSize: MAX_ROOM_SIZE,
  ttlMs: TTL_MS
});

function loadWebUi(): string | null {
  let baseDir = "";
  try {
    baseDir = path.dirname(fileURLToPath(import.meta.url));
  } catch {
    baseDir = process.cwd();
  }
  const candidates = [
    path.resolve(process.cwd(), "web", "index.html"),
    path.resolve(baseDir, "..", "web", "index.html"),
    path.resolve(baseDir, "../../web", "index.html"),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return fs.readFileSync(p, "utf8");
    } catch { /* ignore */ }
  }
  return null;
}

const WS_URL_FOR_BROWSER = process.env.BLACK_MAMBA_WS_URL_PUBLIC
  ?? `ws://ec2-13-53-212-66.eu-north-1.compute.amazonaws.com:${PORT}`;

const server = http.createServer((req, res) => {
  const url = req.url ?? "/";

  if (url === "/healthz") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, rooms: roomManager.listRooms().length, requestId: randomUUID() }));
    return;
  }

  if (req.method === "GET" && (
    url === "/" ||
    url.startsWith("/join/") ||
    url.startsWith("/ghost/") ||
    url.startsWith("/s/")
  )) {
    const html = loadWebUi();
    if (!html) {
      res.writeHead(503, { "Content-Type": "text/plain" });
      res.end("Web UI not found. Run black-mamba relay server.");
      return;
    }

    const roomMatch = url.match(/\/(join|ghost|s)\/([A-Z0-9\-]+)/i);
    const roomCode = roomMatch ? roomMatch[2].toUpperCase() : "";
    const isGhost = url.startsWith("/ghost/") || roomCode.startsWith("G-");
    const isSecret = url.startsWith("/s/");

    const injected = html
      .replace("__WS_URL__", WS_URL_FOR_BROWSER)
      .replace("__ROOM_CODE__", roomCode)
      .replace("__IS_GHOST__", String(isGhost))
      .replace("__IS_SECRET__", String(isSecret))
      .replace("__WEB_URL__", WEB_URL);

    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "X-Frame-Options": "DENY",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "Cache-Control": "no-store"
    });
    res.end(injected);
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "not_found" }));
});

const wss = new WebSocketServer({ server, maxPayload: MAX_PAYLOAD_BYTES });

wss.on("connection", (socket) => {
  registerRelayHandlers(socket, {
    roomManager,
    maxPayloadBytes: MAX_PAYLOAD_BYTES,
    maxMessagesPerSecond: MAX_MESSAGES_PER_SECOND
  });
});

setInterval(() => {
  roomManager.sweepExpired();
}, 15_000).unref();

server.listen(PORT, HOST, () => {
  process.stdout.write(`black mamba relay listening on ${HOST}:${PORT}\n`);
});

function shutdown(signal: NodeJS.Signals): void {
  process.stdout.write(`black mamba relay received ${signal}, shutting down...\n`);
  wss.close();
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
