import readline from "node:readline/promises";
import type { StartupContext } from "./startup.js";

export type MenuChoice = "create" | "join" | "quit";

export async function showMainMenu(): Promise<MenuChoice> {
  const g = (t: string) => `\x1b[32m${t}\x1b[0m`;
  const c = (t: string) => `\x1b[36m${t}\x1b[0m`;
  const b = (t: string) => `\x1b[1m${t}\x1b[0m`;
  const d = (t: string) => `\x1b[2m${t}\x1b[0m`;

  process.stdout.write(`\n${g("┌──────────────────────────────────────────┐")}\n`);
  process.stdout.write(`${g("│")} ${b("black-mamba launcher")}                     ${g("│")}\n`);
  process.stdout.write(`${g("├──────────────────────────────────────────┤")}\n`);
  process.stdout.write(`${g("│")} [${c("1")}] ${b("create room")}   ${d("{ generate session }")}   ${g("│")}\n`);
  process.stdout.write(`${g("│")} [${c("2")}] ${b("join room")}     ${d("{ enter room id }")}      ${g("│")}\n`);
  process.stdout.write(`${g("│")} [${c("Q")}] ${b("quit")}          ${d("{ destroy session }")}    ${g("│")}\n`);
  process.stdout.write(`${g("└──────────────────────────────────────────┘")}\n\n`);
  
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question(`${g("onion")}${d("@")}${g("mamba")}${c("> ")}`)).trim().toLowerCase();
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
  const g = (t: string) => `\x1b[32m${t}\x1b[0m`;
  const c = (t: string) => `\x1b[36m${t}\x1b[0m`;

  process.stdout.write(`\n{ room:${g(roomId)} } ${c("session-online")}\n`);
  process.stdout.write(`fingerprint: ${c(context.shortFingerprint)}\n\n`);
}
