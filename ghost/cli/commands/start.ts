import type { StartupContext } from "../ui/startup.js";
import { showMainMenu } from "../ui/menu.js";
import { createRoom } from "./create.js";
import { joinRoom } from "./join.js";

export async function launchMainMenu(context: StartupContext): Promise<void> {
  while (true) {
    const choice = await showMainMenu();

    if (choice === "create") {
      await createRoom(context);
      return;
    }

    if (choice === "join") {
      await joinRoom(context);
      return;
    }

    if (choice === "quit") {
      process.stdout.write("\n[ black mamba ] Session closed.\n");
      process.exit(0);
    }
  }
}
