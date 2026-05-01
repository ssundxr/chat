import type { WebSocket } from "ws";
import type { BlackMambaEnvelope, PeerInfo, RoomStateSnapshot } from "../shared/types.js";

export type RoomMember = {
  clientId: string;
  socket: WebSocket;
  sender: string;
  fingerprint: string;
  joinedAt: number;
  lastSeenAt: number;
};

type PendingMessage = {
  envelope: BlackMambaEnvelope;
  burnAfterRead: boolean;
  recipients: Set<string>;
  acknowledged: Set<string>;
  expiresAt: number;
};

type RoomState = {
  roomId: string;
  createdAt: number;
  lastActivityAt: number;
  members: Map<string, RoomMember>;
  messageIds: Set<string>;
  pendingMessages: Map<string, PendingMessage>;
  rateWindow: Map<string, number[]>;
};

export type RoomConfig = {
  maxRooms: number;
  maxRoomSize: number;
  ttlMs: number;
};

export class RoomManager {
  private readonly rooms = new Map<string, RoomState>();

  constructor(private readonly config: RoomConfig) {}

  upsertRoom(roomId: string): RoomState {
    const existing = this.rooms.get(roomId);
    if (existing) {
      existing.lastActivityAt = Date.now();
      return existing;
    }

    if (this.rooms.size >= this.config.maxRooms) {
      this.evictOldestRoom();
    }

    const room: RoomState = {
      roomId,
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
      members: new Map(),
      messageIds: new Set(),
      pendingMessages: new Map(),
      rateWindow: new Map()
    };

    this.rooms.set(roomId, room);
    return room;
  }

  joinRoom(roomId: string, member: RoomMember): RoomStateSnapshot {
    const room = this.upsertRoom(roomId);
    if (room.members.size >= this.config.maxRoomSize) {
      throw new Error("room_full");
    }

    room.members.set(member.clientId, member);
    room.lastActivityAt = Date.now();
    return this.snapshot(roomId);
  }

  broadcast(roomId: string, envelope: string, exceptClientId?: string): void {
    const room = this.rooms.get(roomId);
    if (!room) {
      return;
    }

    for (const [clientId, member] of room.members.entries()) {
      if (exceptClientId && clientId === exceptClientId) {
        continue;
      }

      if (member.socket.readyState === 1) {
        member.socket.send(envelope);
      }
    }
  }

  leaveRoom(roomId: string, clientId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) {
      return;
    }

    room.members.delete(clientId);
    room.rateWindow.delete(clientId);
    room.lastActivityAt = Date.now();

    if (room.members.size === 0 && room.pendingMessages.size === 0) {
      this.rooms.delete(roomId);
    }
  }

  removeClientEverywhere(clientId: string): void {
    for (const [roomId, room] of this.rooms.entries()) {
      room.members.delete(clientId);
      room.rateWindow.delete(clientId);
      for (const pending of room.pendingMessages.values()) {
        pending.recipients.delete(clientId);
        pending.acknowledged.delete(clientId);
      }

      if (room.members.size === 0 && room.pendingMessages.size === 0) {
        this.rooms.delete(roomId);
      }
    }
  }

  canSend(roomId: string, clientId: string, limitPerSecond: number): boolean {
    const room = this.rooms.get(roomId);
    if (!room) {
      return false;
    }

    const now = Date.now();
    const window = room.rateWindow.get(clientId) ?? [];
    const recent = window.filter((timestamp) => now - timestamp < 1000);
    if (recent.length >= limitPerSecond) {
      room.rateWindow.set(clientId, recent);
      return false;
    }

    recent.push(now);
    room.rateWindow.set(clientId, recent);
    room.lastActivityAt = now;
    return true;
  }

  registerMessage(envelope: BlackMambaEnvelope, burnAfterRead: boolean): boolean {
    const room = this.rooms.get(envelope.roomId);
    if (!room) {
      return false;
    }

    if (room.messageIds.has(envelope.messageId)) {
      return false;
    }

    room.messageIds.add(envelope.messageId);
    const recipients = new Set(Array.from(room.members.keys()).filter((clientId) => clientId !== envelope.sender));
    room.pendingMessages.set(envelope.messageId, {
      envelope,
      burnAfterRead,
      recipients,
      acknowledged: new Set(),
      expiresAt: envelope.timestamp + this.config.ttlMs
    });
    room.lastActivityAt = Date.now();
    return true;
  }

  acknowledge(roomId: string, messageId: string, clientId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) {
      return false;
    }

    const pending = room.pendingMessages.get(messageId);
    if (!pending) {
      return false;
    }

    pending.acknowledged.add(clientId);
    pending.recipients.delete(clientId);
    room.lastActivityAt = Date.now();

    if (pending.burnAfterRead && pending.recipients.size === 0) {
      room.pendingMessages.delete(messageId);
    }

    return true;
  }

  sweepExpired(): void {
    const now = Date.now();
    for (const [roomId, room] of this.rooms.entries()) {
      for (const [messageId, pending] of room.pendingMessages.entries()) {
        if (pending.expiresAt <= now) {
          room.pendingMessages.delete(messageId);
        }
      }

      if (now - room.lastActivityAt > this.config.ttlMs && room.members.size === 0 && room.pendingMessages.size === 0) {
        this.rooms.delete(roomId);
      }
    }
  }

  getRoom(roomId: string): RoomState | undefined {
    return this.rooms.get(roomId);
  }

  snapshot(roomId: string): RoomStateSnapshot {
    const room = this.rooms.get(roomId);
    if (!room) {
      return { roomId, peerCount: 0, peers: [] };
    }

    const peers: PeerInfo[] = Array.from(room.members.values()).map((member) => ({
      sender: member.sender,
      fingerprint: member.fingerprint,
      lastSeenAt: member.lastSeenAt
    }));

    return {
      roomId,
      peerCount: peers.length,
      peers
    };
  }

  listRooms(): string[] {
    return Array.from(this.rooms.keys());
  }

  private evictOldestRoom(): void {
    let oldestRoomId: string | undefined;
    let oldestCreatedAt = Number.POSITIVE_INFINITY;

    for (const [roomId, room] of this.rooms.entries()) {
      if (room.createdAt < oldestCreatedAt) {
        oldestCreatedAt = room.createdAt;
        oldestRoomId = roomId;
      }
    }

    if (oldestRoomId) {
      this.rooms.delete(oldestRoomId);
    }
  }
}
