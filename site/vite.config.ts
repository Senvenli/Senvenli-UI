import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const src = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      { find: "@senvenli/tokens", replacement: src("../packages/tokens/src/index.ts") },
      { find: "@senvenli/react/display", replacement: src("../packages/react/src/display/index.ts") },
      { find: "@senvenli/react/action", replacement: src("../packages/react/src/action/index.ts") },
      { find: "@senvenli/react/layout", replacement: src("../packages/react/src/layout/index.ts") },
      { find: "@senvenli/react/feedback", replacement: src("../packages/react/src/feedback/index.ts") },
      { find: "@senvenli/react/form", replacement: src("../packages/react/src/form/index.ts") },
      { find: "@senvenli/react/selection", replacement: src("../packages/react/src/selection/index.ts") },
      { find: "@senvenli/react/overlay", replacement: src("../packages/react/src/overlay/index.ts") },
      { find: "@senvenli/react/navigation", replacement: src("../packages/react/src/navigation/index.ts") },
      { find: "@senvenli/react/date", replacement: src("../packages/react/src/date/index.ts") },
      { find: "@senvenli/react/color", replacement: src("../packages/react/src/color/index.ts") },
      { find: "@senvenli/react/collection", replacement: src("../packages/react/src/collection/index.ts") },
      { find: /^@senvenli\/react$/, replacement: src("../packages/react/src/index.ts") },
    ],
  },
  server: { port: 5173, strictPort: true },
});
