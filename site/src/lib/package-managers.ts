import { useSyncExternalStore } from "react";

export const MANAGERS = ["npm", "pnpm", "yarn", "bun"] as const;
export type Manager = (typeof MANAGERS)[number];
export type CommandVariant = { id: Manager; code: string; html?: string };

/** One npm line in each manager's words: install (`npm i`, `-D`) and run once (`npx`, `-y` dropped). */
function convert(line: string, manager: Manager): string | null {
  const install = line.match(/^npm (?:i|install)((?: -D)?) (.+)$/);
  if (install) {
    const dev = install[1] ? (manager === "bun" ? " -d" : " -D") : "";
    return manager === "npm" ? line : `${manager} add${dev} ${install[2]}`;
  }
  const run = line.match(/^npx (?:-y )?(.+)$/);
  if (run) return { npm: `npx ${run[1]}`, pnpm: `pnpm dlx ${run[1]}`, yarn: `yarn dlx ${run[1]}`, bun: `bunx ${run[1]}` }[manager];
  return null;
}

/**
 * The same commands for npm, pnpm, yarn and bun, when every line of a block is an `npm i` or `npx` command; otherwise
 * null (a block that mixes in anything else stays as written).
 */
export function commandsFor(code: string): Record<Manager, string> | null {
  const lines = code.trim().split("\n");
  if (!lines.length || lines.some((line) => convert(line.trim(), "npm") === null)) return null;
  return Object.fromEntries(MANAGERS.map((manager) => [manager, lines.map((line) => convert(line.trim(), manager)).join("\n")])) as Record<Manager, string>;
}

// The reader's choice, shared by every block on the page and remembered in this browser. The prerendered page shows
// npm; the stored choice applies after hydration, so the server and client markup agree.
const KEY = "ds-package-manager";
const listeners = new Set<() => void>();
let current: Manager | null = null;

function read(): Manager {
  if (current) return current;
  try {
    const stored = window.localStorage.getItem(KEY);
    current = MANAGERS.includes(stored as Manager) ? (stored as Manager) : "npm";
  } catch {
    current = "npm";
  }
  return current;
}

export function setManager(manager: Manager) {
  current = manager;
  try {
    window.localStorage.setItem(KEY, manager);
  } catch {
    // Private mode or blocked storage: the choice lasts for this page only.
  }
  for (const listener of listeners) listener();
}

export function useManager(): Manager {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    read,
    () => "npm",
  );
}
