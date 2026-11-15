import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@senvenli/tokens": fileURLToPath(new URL("../packages/tokens/src/index.ts", import.meta.url)),
    },
  },
  server: { port: 5173, strictPort: true },
});
