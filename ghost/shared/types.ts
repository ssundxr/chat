export type BlackMambaMessageType = "message" | "join" | "leave" | "ack" | "key_exchange";

export type BlackMambaPayload = {
  [key: string]: unknown;
};

export type BlackMambaEnvelope = {
  type: BlackMambaMessageType;
  roomId: string;
  messageId: string;
  sender: string;
  payload: BlackMambaPayload;
  timestamp: number;
};

export type PeerInfo = {
  sender: string;
  fingerprint: string;
  lastSeenAt: number;
};

export type RoomStateSnapshot = {
  roomId: string;
  peerCount: number;
  peers: PeerInfo[];
};
