import { randomBytes, randomUUID } from "node:crypto";
import type { StartupContext } from "../ui/startup.js";
import { printSessionBanner } from "../ui/menu.js";
import { runChat } from "../ui/chat.js";

export function createRoomId(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(4);
  return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join("");
}

export async function createRoom(context: StartupContext): Promise<void> {
  const roomId = createRoomId();
  const clientId = randomUUID();
  printSessionBanner(context, roomId);
  await runChat(roomId, context, clientId);
}
