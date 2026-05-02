import type { StartupContext } from "../ui/startup.js";
import { showMainMenu } from "../ui/menu.js";
import { createRoom, createGhostRoom } from "./create.js";
import { joinRoom } from "./join.js";

export async function launchMainMenu(context: StartupContext): Promise<void> {
  while (true) {
    const choice = await showMainMenu(context);

    if (choice === "create") {
      await createRoom(context);
      return;
    }

    if (choice === "join") {
      await joinRoom(context);
      return;
    }

    if (choice === "ghost") {
      await createGhostRoom(context);
      return;
    }

    if (choice === "quit") {
      process.stdout.write("\n  [ black-mamba ] session closed. no trace.\n");
      process.exit(0);
    }
  }
}
