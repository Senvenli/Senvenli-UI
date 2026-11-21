// After `react-router build`: the two things the prerender does not do for a plain static host.
import { copyFile, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const build = new URL(`../${process.env.SITE_BUILD_DIR ?? "build"}/`, import.meta.url);
const out = fileURLToPath(new URL("client/", build));

// 1. nginx serves /404.html for a missing file (error_page 404 /404.html); the prerender wrote 404/index.html.
await copyFile(join(out, "404/index.html"), join(out, "404.html"));
await rm(join(out, "404"), { recursive: true });

// 2. The prerender writes a `.data` file (the single-fetch payload) beside every resource route too.
//    Nothing requests "button.json.data": the twins are fetched as files, never navigated to.
let removed = 0;
for (const entry of await readdir(out, { recursive: true })) {
  if (/\.(json|md)\.data$/.test(entry)) {
    await rm(join(out, entry));
    removed += 1;
  }
}

// 3. No runtime server (ssr: false): the server bundle was only the prerenderer.
await rm(fileURLToPath(new URL("server/", build)), { recursive: true, force: true });

console.log(`postbuild: wrote 404.html, removed ${removed} unused .data files and build/server`);
