# @senvenli/mcp

An MCP server for building with Senvenli UI from AI coding agents. It answers from data bundled with the package:
every component's page, manifest and example code, the docs, and the theme engine. It is read-only: no file writes,
no network calls.

## Tools

| Tool | What it returns |
| --- | --- |
| `search_components` | Components for a purpose ("date range", "confirm a delete") or an export name, best match first, with the import. |
| `list_components` | Every component, or one family, with a one-line description. |
| `get_component` | A component's page as Markdown: import, example code, guidelines, accessibility, props. `sections` picks parts. |
| `get_component_manifest` | The manifest as JSON. `props`: `own`, `own+aria` (default) or `all`; `minified` (default true). |
| `get_doc` | A doc: getting started, theming, dark mode, languages and RTL, native apps, agents, design rules, accessibility. |
| `create_theme` | A theme from up to three colors: the WCAG AA report, a preset code and the CLI command (default), or the CSS / native hex. |
| `validate_theme` | The WCAG AA report for a `theme.css`: failing pairs and missing tokens, light and dark. |

Prompts: `build_form`, `theme_app`. Resources: `senvenli://components/<name>`, `senvenli://docs/<name>`.

Colors are `#rrggbb`, `#rgb` or `oklch(L C H)`; anything else is an error, never silently ignored. Every component
answer stays under 20,000 characters (a test holds it there).

## Local (stdio)

```sh
claude mcp add senvenli-ui -- npx -y @senvenli/mcp
```

Other clients (Cursor, VS Code, Windsurf): see https://design.senvenli.com/docs/agents.

## Hosted (Streamable HTTP)

`node dist/http.js` serves `POST /mcp`, stateless, on `HOST:PORT` (default `127.0.0.1:8787`). Put a proxy in front
for public use; `HOST=0.0.0.0` listens on every interface.

## Development

```sh
pnpm --filter @senvenli/mcp build   # bundles data/registry.json, then compiles
pnpm vitest run packages/mcp        # rebuilds the data, then tests the tools
```
