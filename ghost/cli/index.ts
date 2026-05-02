#!/usr/bin/env node
import { startup } from "./ui/startup.js";
import { launchMainMenu } from "./commands/start.js";
import { runSecretCommand } from "./commands/secret.js";

async function main(): Promise<void> {
  const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));

  if (args[0] === "secret") {
    const secretText = args.slice(1).join(" ").trim();
    if (!secretText) {
      process.stderr.write("Usage: black-mamba secret \"your secret text\"\n");
      process.exitCode = 1;
      return;
    }
    await runSecretCommand(secretText);
    return;
  }

  const context = await startup();
  await launchMainMenu(context);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`black mamba failed to start: ${message}\n`);
  process.exitCode = 1;
});
