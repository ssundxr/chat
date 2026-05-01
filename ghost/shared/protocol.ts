import type { BlackMambaEnvelope, BlackMambaMessageType, BlackMambaPayload } from "./types.js";

export function createEnvelope(
  type: BlackMambaMessageType,
  roomId: string,
  messageId: string,
  sender: string,
  payload: BlackMambaPayload,
  timestamp: number = Date.now()
): BlackMambaEnvelope {
  return {
    type,
    roomId,
    messageId,
    sender,
    payload,
    timestamp
  };
}

export function isBlackMambaEnvelope(value: unknown): value is BlackMambaEnvelope {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<BlackMambaEnvelope>;
  return (
    typeof candidate.type === "string" &&
    typeof candidate.roomId === "string" &&
    typeof candidate.messageId === "string" &&
    typeof candidate.sender === "string" &&
    typeof candidate.timestamp === "number" &&
    typeof candidate.payload === "object" &&
    candidate.payload !== null
  );
}
