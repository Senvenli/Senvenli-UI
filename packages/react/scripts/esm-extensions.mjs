// tsc (moduleResolution "Bundler") keeps relative specifiers as written: `./button`. Bundlers resolve that, Node's ESM
// loader does not, so SSR that leaves dependencies to Node (Next.js, React Router) would fail. After the build, every
// relative specifier in dist (.js and .d.ts) gets its real file: `./button.js`, or `./form/index.js` for a folder.
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const dist = resolve(dirname(fileURLToPath(import.meta.url)), "../dist");
const SPECIFIER = /((?:from|import)\s*\(?\s*["'])(\.{1,2}\/[^"']*)(["'])/g;

function target(file, spec) {
  if (/\.(?:js|json|css)$/.test(spec)) return spec;
  const base = resolve(dirname(file), spec);
  if (existsSync(`${base}.js`)) return `${spec}.js`;
  if (existsSync(join(base, "index.js"))) return `${spec}/index.js`;
  throw new Error(`${file}: cannot resolve ${spec}`);
}

let changed = 0;
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.(?:js|d\.ts)$/.test(name)) {
      const before = readFileSync(path, "utf8");
      const after = before.replace(SPECIFIER, (_, head, spec, tail) => `${head}${target(path, spec)}${tail}`);
      if (after !== before) {
        writeFileSync(path, after);
        changed++;
      }
    }
  }
}
walk(dist);
console.log(`esm-extensions: ${changed} files`);
