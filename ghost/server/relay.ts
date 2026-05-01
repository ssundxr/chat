import type { WebSocket } from "ws";
import type { BlackMambaEnvelope } from "../shared/types.js";
import { isBlackMambaEnvelope } from "../shared/protocol.js";
import { RoomManager, type RoomMember } from "./room-manager.js";

export type RelayDependencies = {
  roomManager: RoomManager;
  maxPayloadBytes: number;
  maxMessagesPerSecond: number;
};

type InternalSocket = WebSocket & {
  blackMambaClientId?: string;
  blackMambaRoomId?: string;
};

export function registerRelayHandlers(socket: WebSocket, dependencies: RelayDependencies): void {
  const internalSocket = socket as InternalSocket;

  socket.on("message", (raw) => {
    const buffer = normalizeRawData(raw);
    if (!buffer || buffer.byteLength > dependencies.maxPayloadBytes) {
      socket.close(1009, "payload too large");
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(buffer.toString("utf8"));
    } catch {
      return;
    }

    if (!isBlackMambaEnvelope(parsed)) {
      return;
    }

    const envelope = parsed as BlackMambaEnvelope;
    if (envelope.type === "join") {
      const clientId = String(envelope.payload.clientId ?? "");
      const fingerprint = String(envelope.payload.fingerprint ?? "");
      if (!clientId || !fingerprint) {
        return;
      }

      try {
        const member: RoomMember = {
          clientId,
          socket,
          sender: envelope.sender,
          fingerprint,
          joinedAt: envelope.timestamp,
          lastSeenAt: envelope.timestamp
        };

        dependencies.roomManager.joinRoom(envelope.roomId, member);
        internalSocket.blackMambaClientId = clientId;
        internalSocket.blackMambaRoomId = envelope.roomId;
      } catch {
        socket.close(1008, "room full");
        return;
      }
    }

    if (envelope.type === "leave") {
      const clientId = String(envelope.payload.clientId ?? "");
      dependencies.roomManager.leaveRoom(envelope.roomId, clientId);
      return;
    }

    if (envelope.type === "ack") {
      const clientId = String(envelope.payload.clientId ?? "");
      const messageId = String(envelope.payload.messageId ?? envelope.messageId);
      dependencies.roomManager.acknowledge(envelope.roomId, messageId, clientId);
      dependencies.roomManager.broadcast(envelope.roomId, JSON.stringify(envelope), clientId);
      return;
    }

    if (envelope.type === "message") {
      const senderClientId = String(envelope.payload.clientId ?? envelope.sender);
      if (!dependencies.roomManager.canSend(envelope.roomId, senderClientId, dependencies.maxMessagesPerSecond)) {
        socket.close(1013, "rate limited");
        return;
      }

      const burnAfterRead = Boolean(envelope.payload.burnAfterRead);
      if (!dependencies.roomManager.registerMessage(envelope, burnAfterRead)) {
        socket.close(1008, "duplicate message");
        return;
      }
    }

    dependencies.roomManager.broadcast(envelope.roomId, JSON.stringify(envelope));
  });

  socket.on("close", () => {
    const clientId = internalSocket.blackMambaClientId;
    if (clientId) {
      dependencies.roomManager.removeClientEverywhere(clientId);
    }
  });
}

function normalizeRawData(raw: WebSocket.RawData): Buffer | undefined {
  if (typeof raw === "string") {
    return Buffer.from(raw, "utf8");
  }

  if (Buffer.isBuffer(raw)) {
    return raw;
  }

  if (raw instanceof ArrayBuffer) {
    return Buffer.from(raw);
  }

  if (Array.isArray(raw)) {
    return Buffer.concat(raw.map((chunk) => (Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))));
  }

  return undefined;
}
