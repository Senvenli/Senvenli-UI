import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { aliases } from "./aliases.ts";

export default defineConfig({
  // reactRouter() brings its own React transform: @vitejs/plugin-react must not run beside it.
  plugins: [tailwindcss(), reactRouter()],
  resolve: { alias: aliases },
  build: {
    rollupOptions: {
      // The library's files start with "use client" (for Next); a bundle has no use for it and Rollup says so once per file.
      onwarn(warning, warn) {
        if (warning.code === "MODULE_LEVEL_DIRECTIVE" || (warning.code === "SOURCEMAP_ERROR" && warning.loc?.line === 1)) return;
        warn(warning);
      },
    },
  },
  server: { port: 5180, strictPort: true },
  preview: { port: 5181, strictPort: true },
});
