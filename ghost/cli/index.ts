import { startup } from "./ui/startup.js";
import { launchMainMenu } from "./commands/start.js";

async function main(): Promise<void> {
  const context = await startup();
  await launchMainMenu(context);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`black mamba failed to start: ${message}\n`);
  process.exitCode = 1;
});
