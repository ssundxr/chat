import { randomBytes, randomUUID } from "node:crypto";
import type { StartupContext } from "../ui/startup.js";
import { printSessionBanner } from "../ui/menu.js";
import { runChat } from "../ui/chat.js";

export function createRoomId(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(4);
  return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join("");
}

const WEB_URL = process.env.BLACK_MAMBA_WEB_URL ?? "http://ec2-13-53-212-66.eu-north-1.compute.amazonaws.com:8090";

export async function createRoom(context: StartupContext): Promise<void> {
  const roomId = createRoomId();
  const clientId = randomUUID();
  printSessionBanner(context, roomId, false);
  printShareLink(roomId, false);
  await runChat(roomId, context, clientId);
}

export async function createGhostRoom(context: StartupContext): Promise<void> {
  const roomId = `G-${createRoomId()}`;
  const clientId = randomUUID();
  printSessionBanner(context, roomId, true);
  printShareLink(roomId, true);
  await runChat(roomId, context, clientId, { ghost: true, burnAfterRead: true });
}

function printShareLink(roomId: string, isGhost: boolean): void {
  const g = (t: string) => `\x1b[32m${t}\x1b[0m`;
  const o = (t: string) => `\x1b[38;5;208m${t}\x1b[0m`;
  const d = (t: string) => `\x1b[2m${t}\x1b[0m`;
  const b = (t: string) => `\x1b[1m${t}\x1b[0m`;
  const route = isGhost ? "ghost" : "join";
  const link = `${WEB_URL}/${route}/${roomId}`;
  process.stdout.write(
    `  ${d("└─")} ${isGhost ? o("share (ghost)") : g("share")} ${b(link)}\n` +
    `  ${d("└─ anyone with this link can join — no install required")}\n\n`
  );
}
