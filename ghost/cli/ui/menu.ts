import readline from "node:readline/promises";
import type { StartupContext } from "./startup.js";

export type MenuChoice = "create" | "join" | "ghost" | "quit";

export async function showMainMenu(context: StartupContext): Promise<MenuChoice> {
  const g = (t: string) => `\x1b[32m${t}\x1b[0m`;
  const c = (t: string) => `\x1b[36m${t}\x1b[0m`;
  const b = (t: string) => `\x1b[1m${t}\x1b[0m`;
  const d = (t: string) => `\x1b[2m${t}\x1b[0m`;
  const r = (t: string) => `\x1b[31m${t}\x1b[0m`;
  const o = (t: string) => `\x1b[38;5;208m${t}\x1b[0m`;

  const torBadge = context.torEnabled ? `  ${o("◈ TOR")}` : "";
  const ghostBadge = context.ghostMode ? `  ${r("◈ GHOST")}` : "";

  process.stdout.write(`\n${g("╔══════════════════════════════════════════════╗")}\n`);
  process.stdout.write(`${g("║")}  ${b("BLACK-MAMBA")} ${d(":: secure ephemeral channel")}${torBadge}${ghostBadge}\n`);
  process.stdout.write(`${g("║")}  ${d("identity:")} ${c(context.shortFingerprint)}${" ".repeat(Math.max(0, 28 - context.shortFingerprint.length))}\n`);
  process.stdout.write(`${g("╠══════════════════════════════════════════════╣")}\n`);
  process.stdout.write(`${g("║")}  ${d("[")}${c("1")}${d("]")} ${b("create")}  ${d("── spawn a new encrypted room")}\n`);
  process.stdout.write(`${g("║")}  ${d("[")}${c("2")}${d("]")} ${b("join")}    ${d("── connect to existing room")}\n`);
  process.stdout.write(`${g("║")}  ${d("[")}${c("3")}${d("]")} ${o("ghost")}    ${d("── ")}${o("10min self-destruct · burn-on-read")}\n`);
  process.stdout.write(`${g("║")}  ${d("[")}${c("Q")}${d("]")} ${r("quit")}    ${d("── destroy session")}\n`);
  process.stdout.write(`${g("╚══════════════════════════════════════════════╝")}\n\n`);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question(`  ${g("mamba")}${d("@")}${c("node")} ${d("▸")} `)).trim().toLowerCase();
  rl.close();

  if (answer === "1" || answer === "create") return "create";
  if (answer === "2" || answer === "join") return "join";
  if (answer === "3" || answer === "ghost") return "ghost";

  return "quit";
}

export function printSessionBanner(context: StartupContext, roomId: string, isGhost = false): void {
  const g = (t: string) => `\x1b[32m${t}\x1b[0m`;
  const c = (t: string) => `\x1b[36m${t}\x1b[0m`;
  const o = (t: string) => `\x1b[38;5;208m${t}\x1b[0m`;
  const d = (t: string) => `\x1b[2m${t}\x1b[0m`;
  const b = (t: string) => `\x1b[1m${t}\x1b[0m`;

  if (isGhost) {
    process.stdout.write(`\n  ${o("◈ GHOST ROOM")} ${b(roomId)} ${d("─ self-destruct in 10:00")}\n`);
    process.stdout.write(`  ${d("└─")} ${o("burn-after-read · tor-routed · zero-trace")}\n\n`);
  } else {
    process.stdout.write(`\n  ${g("◈ ROOM")} ${b(roomId)} ${d("─ session online")}\n`);
    process.stdout.write(`  ${d("└─")} fingerprint ${c(context.shortFingerprint)}\n\n`);
  }
}
