import { highlight } from "./highlight.server";
import { commandsFor, MANAGERS, type CommandVariant } from "./package-managers";

/** Build time: the npm, pnpm, yarn and bun forms of an install or run-once block, highlighted; undefined for any other. */
export async function commandVariants(code: string): Promise<CommandVariant[] | undefined> {
  const commands = commandsFor(code);
  if (!commands) return undefined;
  return Promise.all(MANAGERS.map(async (id) => ({ id, code: commands[id], html: await highlight(commands[id], "bash") })));
}
