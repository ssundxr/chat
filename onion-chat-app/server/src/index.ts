import { createServer } from "node:http";
import { config } from "dotenv";
import { nanoid } from "nanoid";
import { WebSocket, WebSocketServer } from "ws";

config();

type PeerInfo = {
  clientId: string;
  publicKeyJwk: JsonWebKey;
  joinedAt: number;
};

type Envelope = {
  toClientId: string;
  nonceB64: string;
  ciphertextB64: string;
};

type RelayPacket = {
  event: "relay_message";
  roomId: string;
  messageId: string;
  senderId: string;
  createdAt: number;
  expiresAt: number;
  burnAfterRead: boolean;
  envelope: Envelope;
};

type PendingMessage = {
  roomId: string;
  messageId: string;
  senderId: string;
  createdAt: number;
  expiresAt: number;
  burnAfterRead: boolean;
  envelopes: Envelope[];
  deliveredTo: Set<string>;
};

type RoomState = {
  peers: Map<string, PeerInfo>;
  sockets: Map<string, WebSocket>;
  pending: Map<string, PendingMessage>;
  lastActivityAt: number;
};

type IncomingJoin = {
  event: "join_room";
  roomId: string;
  clientId: string;
  publicKeyJwk: JsonWebKey;
};

type IncomingMessage = {
  event: "chat_envelopes";
  roomId: string;
  messageId?: string;
  senderId: string;
  createdAt: number;
  ttlSeconds?: number;
  burnAfterRead?: boolean;
  envelopes: Envelope[];
};

type IncomingAck = {
  event: "ack_message";
  roomId: string;
  messageId: string;
  clientId: string;
};

type IncomingSessionReset = {
  event: "session_reset";
  roomId: string;
  clientId: string;
  publicKeyJwk: JsonWebKey;
};

type IncomingLeave = {
  event: "leave_room";
  roomId: string;
  clientId: string;
};

type IncomingEvent = IncomingJoin | IncomingMessage | IncomingAck | IncomingSessionReset | IncomingLeave;

const PORT = Number(process.env.PORT ?? 8080);
const HOST = process.env.HOST ?? "0.0.0.0";
const ALLOWED_ORIGIN = process.env.CORS_ORIGIN ?? "http://localhost:5173";
const ROOM_TTL_MS = Number(process.env.ROOM_TTL_SECONDS ?? 600) * 1000;
const DEFAULT_MESSAGE_TTL_MS = Number(process.env.DEFAULT_MESSAGE_TTL_SECONDS ?? 420) * 1000;

const rooms = new Map<string, RoomState>();

const httpServer = createServer((req, res) => {
  if (req.url === "/healthz") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

const wss = new WebSocketServer({
  server: httpServer,
  path: "/ws",
  verifyClient: (info, done) => {
    const origin = info.origin ?? "";
    const originAllowed = origin === ALLOWED_ORIGIN || origin.endsWith(".onion");
    done(originAllowed, originAllowed ? 200 : 403, originAllowed ? "OK" : "Forbidden");
  }
});

function safeSend(ws: WebSocket, payload: unknown): void {
  if (ws.readyState !== WebSocket.OPEN) {
    return;
  }

  ws.send(JSON.stringify(payload));
}

function getOrCreateRoom(roomId: string): RoomState {
  const existing = rooms.get(roomId);
  if (existing) {
    existing.lastActivityAt = Date.now();
    return existing;
  }

  const created: RoomState = {
    peers: new Map(),
    sockets: new Map(),
    pending: new Map(),
    lastActivityAt: Date.now()
  };

  rooms.set(roomId, created);
  return created;
}

function broadcastRoom(room: RoomState, payload: unknown, exceptClientId?: string): void {
  for (const [clientId, ws] of room.sockets.entries()) {
    if (exceptClientId && clientId === exceptClientId) {
      continue;
    }
    safeSend(ws, payload);
  }
}

function sendRoomSnapshot(ws: WebSocket, roomId: string, room: RoomState, clientId: string): void {
  const peers = Array.from(room.peers.values()).filter((peer) => peer.clientId !== clientId);

  safeSend(ws, {
    event: "room_snapshot",
    roomId,
    peers
  });

  const now = Date.now();
  for (const message of room.pending.values()) {
    if (message.expiresAt <= now) {
      continue;
    }

    const envelope = message.envelopes.find((entry) => entry.toClientId === clientId);
    if (!envelope) {
      continue;
    }

    const packet: RelayPacket = {
      event: "relay_message",
      roomId,
      messageId: message.messageId,
      senderId: message.senderId,
      createdAt: message.createdAt,
      expiresAt: message.expiresAt,
      burnAfterRead: message.burnAfterRead,
      envelope
    };

    safeSend(ws, packet);
  }
}

function removeClientFromRoom(roomId: string, clientId: string): void {
  const room = rooms.get(roomId);
  if (!room) {
    return;
  }

  room.peers.delete(clientId);
  room.sockets.delete(clientId);
  room.lastActivityAt = Date.now();

  broadcastRoom(room, {
    event: "peer_left",
    roomId,
    clientId
  });

  if (room.peers.size === 0 && room.pending.size === 0) {
    rooms.delete(roomId);
  }
}

function processJoin(ws: WebSocket, payload: IncomingJoin): void {
  const room = getOrCreateRoom(payload.roomId);

  room.peers.set(payload.clientId, {
    clientId: payload.clientId,
    publicKeyJwk: payload.publicKeyJwk,
    joinedAt: Date.now()
  });
  room.sockets.set(payload.clientId, ws);

  (ws as WebSocket & { state?: { roomId: string; clientId: string } }).state = {
    roomId: payload.roomId,
    clientId: payload.clientId
  };

  sendRoomSnapshot(ws, payload.roomId, room, payload.clientId);

  broadcastRoom(
    room,
    {
      event: "peer_joined",
      roomId: payload.roomId,
      clientId: payload.clientId,
      publicKeyJwk: payload.publicKeyJwk,
      joinedAt: Date.now()
    },
    payload.clientId
  );
}

function processEnvelopes(payload: IncomingMessage): void {
  const room = rooms.get(payload.roomId);
  if (!room || !room.peers.has(payload.senderId)) {
    return;
  }

  const now = Date.now();
  const ttlMs = Math.max(60_000, Math.min((payload.ttlSeconds ?? DEFAULT_MESSAGE_TTL_MS / 1000) * 1000, 10 * 60_000));
  const messageId = payload.messageId ?? nanoid();
  const expiresAt = now + ttlMs;

  const validEnvelopes = payload.envelopes.filter((envelope) => room.peers.has(envelope.toClientId));
  if (validEnvelopes.length === 0) {
    return;
  }

  const pending: PendingMessage = {
    roomId: payload.roomId,
    messageId,
    senderId: payload.senderId,
    createdAt: payload.createdAt || now,
    expiresAt,
    burnAfterRead: payload.burnAfterRead ?? false,
    envelopes: validEnvelopes,
    deliveredTo: new Set()
  };

  room.pending.set(messageId, pending);
  room.lastActivityAt = now;

  for (const envelope of validEnvelopes) {
    const recipientSocket = room.sockets.get(envelope.toClientId);
    if (!recipientSocket) {
      continue;
    }

    const packet: RelayPacket = {
      event: "relay_message",
      roomId: payload.roomId,
      messageId,
      senderId: payload.senderId,
      createdAt: pending.createdAt,
      expiresAt,
      burnAfterRead: pending.burnAfterRead,
      envelope
    };

    safeSend(recipientSocket, packet);
  }
}

function processAck(payload: IncomingAck): void {
  const room = rooms.get(payload.roomId);
  if (!room) {
    return;
  }

  const pending = room.pending.get(payload.messageId);
  if (!pending) {
    return;
  }

  pending.deliveredTo.add(payload.clientId);

  if (pending.burnAfterRead && pending.deliveredTo.size >= pending.envelopes.length) {
    room.pending.delete(payload.messageId);
  }
}

function processSessionReset(payload: IncomingSessionReset): void {
  const room = rooms.get(payload.roomId);
  if (!room) {
    return;
  }

  const peer = room.peers.get(payload.clientId);
  if (!peer) {
    return;
  }

  peer.publicKeyJwk = payload.publicKeyJwk;
  room.lastActivityAt = Date.now();

  broadcastRoom(
    room,
    {
      event: "session_reset",
      roomId: payload.roomId,
      clientId: payload.clientId,
      publicKeyJwk: payload.publicKeyJwk,
      timestamp: Date.now()
    },
    payload.clientId
  );
}

setInterval(() => {
  const now = Date.now();

  for (const [roomId, room] of rooms.entries()) {
    for (const [messageId, pending] of room.pending.entries()) {
      if (pending.expiresAt <= now) {
        room.pending.delete(messageId);
      }
    }

    const roomIsExpired = room.peers.size === 0 && now - room.lastActivityAt > ROOM_TTL_MS;
    if (roomIsExpired) {
      rooms.delete(roomId);
    }
  }
}, 15_000);

wss.on("connection", (ws) => {
  safeSend(ws, {
    event: "connected",
    timestamp: Date.now(),
    serverPolicy: {
      relayOnly: true,
      storesPlaintext: false,
      maxTtlSeconds: 600
    }
  });

  ws.on("message", (raw) => {
    let payload: IncomingEvent;
    try {
      payload = JSON.parse(raw.toString()) as IncomingEvent;
    } catch {
      return;
    }

    switch (payload.event) {
      case "join_room":
        processJoin(ws, payload);
        break;
      case "chat_envelopes":
        processEnvelopes(payload);
        break;
      case "ack_message":
        processAck(payload);
        break;
      case "session_reset":
        processSessionReset(payload);
        break;
      case "leave_room":
        removeClientFromRoom(payload.roomId, payload.clientId);
        break;
      default:
        break;
    }
  });

  ws.on("close", () => {
    const state = (ws as WebSocket & { state?: { roomId: string; clientId: string } }).state;
    if (!state) {
      return;
    }

    removeClientFromRoom(state.roomId, state.clientId);
  });
});

httpServer.listen(PORT, HOST, () => {
  console.log(`Ephemeral Onion Chat relay listening on ${HOST}:${PORT}`);
});
