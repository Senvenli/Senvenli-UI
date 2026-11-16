import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Tests run against package sources, no build needed.
    alias: {
      "@senvenli/tokens": fileURLToPath(new URL("./packages/tokens/src/index.ts", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    // Testing Library cleans up after each test only when test globals exist.
    globals: true,
    include: ["packages/*/src/**/*.test.{ts,tsx}"],
  },
});
