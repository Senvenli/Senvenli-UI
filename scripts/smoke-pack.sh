#!/bin/sh
# Release check: pack every package as npm would publish it, install the tarballs into a fresh project, and use them
# the way an app does (Node SSR, every subpath, the CLI, the MCP server, TypeScript). Run after `pnpm build`.
set -eu
root=$(cd "$(dirname "$0")/.." && pwd)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
mkdir "$work/pack" "$work/app"
for p in tokens react cli mcp; do (cd "$root/packages/$p" && pnpm pack --pack-destination "$work/pack" >/dev/null); done
cd "$work/app"
npm init -y >/dev/null
npm i --no-audit --no-fund --silent "$work"/pack/*.tgz react@19 react-dom@19 react-aria-components lucide-react@1.34.0 typescript@5 @types/react@19 @types/react-dom@19

cat > smoke.mjs <<'JS'
import { renderToString } from "react-dom/server";
import { createElement as h } from "react";
const subpaths = ["display", "action", "layout", "feedback", "form", "selection", "overlay", "navigation", "date", "color", "collection", "charts"];
for (const s of subpaths) if (!Object.keys(await import(`@senvenli/react/${s}`)).length) throw new Error(`empty subpath ${s}`);
const { Button } = await import("@senvenli/react/action");
if (!renderToString(h(Button, null, "Save")).includes("Save")) throw new Error("SSR failed");
const { createTheme } = await import("@senvenli/tokens");
if (!createTheme({ primary: "#1268ae" }).checks.every((c) => c.pass)) throw new Error("theme fails AA");
console.log("node: subpaths, SSR, tokens ok");
JS
node smoke.mjs

npx --no-install @senvenli/cli theme --out theme.css >/dev/null && test -s theme.css && echo "cli: theme.css ok"

reply=$( (printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}' '{"jsonrpc":"2.0","method":"notifications/initialized"}' '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'; sleep 2) | npx --no-install @senvenli/mcp)
echo "$reply" | grep -q '"validate_theme"' && echo "mcp: tools ok"

cat > app.tsx <<'TSX'
import { DesignSystemProvider } from "@senvenli/react";
import { Button } from "@senvenli/react/action";
import { DatePicker } from "@senvenli/react/date";
export const App = () => (
  <DesignSystemProvider>
    <Button variant="primary" onPress={() => {}}>Save</Button>
    <DatePicker label="Day" />
  </DesignSystemProvider>
);
TSX
npx --no-install tsc --noEmit --strict --skipLibCheck --jsx react-jsx --module esnext --moduleResolution bundler --target es2022 app.tsx && echo "types: ok"
echo "smoke-pack: all good"
