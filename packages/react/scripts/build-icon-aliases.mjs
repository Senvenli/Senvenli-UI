#!/usr/bin/env node
/**
 * Writes src/display/icon-aliases.ts: Lucide's alias names (older names
 * such as "alarm-check" or "bar-chart-3") mapped to the component in
 * `icons` that draws them. The Icon registry ships only `icons`, so the
 * aliases cost a small table instead of the whole lucide-react namespace.
 * Run after upgrading lucide-react; src/display/icon.test.tsx fails when
 * the table is stale.
 */
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const lucide = require("lucide-react");
const { iconNames } = require("lucide-react/dynamic");
const { version } = require("lucide-react/package.json");

const pascal = (name) => name.split("-").map((part) => part[0].toUpperCase() + part.slice(1)).join("");
const canonical = new Map(Object.entries(lucide.icons).map(([key, value]) => [value, key]));
const rows = [];
for (const name of iconNames) {
  if (lucide.icons[pascal(name)]) continue;
  const target = canonical.get(lucide[pascal(name)]);
  if (!target) throw new Error(`No icon in lucide.icons draws "${name}".`);
  rows.push(`  "${name}": "${target}",`);
}
const out =
  `// Generated from lucide-react ${version} by scripts/build-icon-aliases.mjs; do not edit.\n` +
  "// Lucide alias names (older names kept for compatibility) mapped to the icon they draw.\n" +
  `export const ICON_ALIASES: Readonly<Record<string, string>> = {\n${rows.join("\n")}\n};\n`;
if (process.argv.includes("--stdout")) process.stdout.write(out);
else {
  fs.writeFileSync(new URL("../src/display/icon-aliases.ts", import.meta.url), out);
  console.log(`icon-aliases.ts: ${rows.length} aliases`);
}
