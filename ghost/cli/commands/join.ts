import readline from "node:readline/promises";
import { randomUUID } from "node:crypto";
import type { StartupContext } from "../ui/startup.js";
import { runChat } from "../ui/chat.js";

export async function joinRoom(context: StartupContext): Promise<void> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const roomId = (await rl.question("Enter room ID: ")).trim().toUpperCase();
  rl.close();

  if (!roomId) {
    return;
  }

  process.stdout.write(`\n[ black mamba ] Joining room: ${roomId}\n\n`);
  await runChat(roomId, context, randomUUID());
}
