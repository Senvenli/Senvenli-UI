import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { aliases } from "./aliases.ts";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  resolve: { alias: aliases },
  test: {
    // Node, not jsdom: the prerender has no `window`, and a page that reads one must fail here.
    environment: "node",
    include: ["tests/**/*.test.{ts,tsx}"],
    testTimeout: 30_000,
  },
});
