import { fileURLToPath } from "node:url";

const src = (path: string) => fileURLToPath(new URL(path, import.meta.url));

const FAMILIES = ["display", "action", "layout", "feedback", "form", "selection", "overlay", "navigation", "date", "color", "collection", "charts"];

/** The site builds against the packages' sources. Shared by vite.config.ts and vitest.config.ts. */
export const aliases = [
  { find: "@senvenli/tokens", replacement: src("../packages/tokens/src/index.ts") },
  ...FAMILIES.map((family) => ({ find: `@senvenli/react/${family}`, replacement: src(`../packages/react/src/${family}/index.ts`) })),
  { find: /^@senvenli\/react$/, replacement: src("../packages/react/src/index.ts") },
];
