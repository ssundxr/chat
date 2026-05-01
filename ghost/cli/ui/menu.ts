import readline from "node:readline/promises";
import type { StartupContext } from "./startup.js";

export type MenuChoice = "create" | "join" | "quit";

export async function showMainMenu(): Promise<MenuChoice> {
  process.stdout.write(`\n┌──────────────────────────────────────────┐\n`);
  process.stdout.write(`│ black-mamba launcher                     │\n`);
  process.stdout.write(`├──────────────────────────────────────────┤\n`);
  process.stdout.write(`│ [1] create room   { generate session }   │\n`);
  process.stdout.write(`│ [2] join room     { enter room id }      │\n`);
  process.stdout.write(`│ [Q] quit          { destroy session }    │\n`);
  process.stdout.write(`└──────────────────────────────────────────┘\n\n`);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question("black-mamba> ")).trim().toLowerCase();
  rl.close();

  if (answer === "1" || answer === "create") {
    return "create";
  }

  if (answer === "2" || answer === "join") {
    return "join";
  }

  return "quit";
}

export function printSessionBanner(context: StartupContext, roomId: string): void {
  process.stdout.write(`\n{ room:${roomId} } session-online\n`);
  process.stdout.write(`fingerprint: ${context.shortFingerprint}\n\n`);
}
