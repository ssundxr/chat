import http from "node:http";
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

const roomManager = new RoomManager({
  maxRooms: MAX_ROOMS,
  maxRoomSize: MAX_ROOM_SIZE,
  ttlMs: TTL_MS
});

const server = http.createServer((req, res) => {
  if (req.url === "/healthz") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, requestId: randomUUID() }));
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
