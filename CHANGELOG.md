# Changelog

## 0.2.0 (2026-11-25)

- `@senvenli/tokens`: `darkColors`, hand-picked dark-mode colors per role (`{ primary: "#c99a2e" }`). A given color is
  used as-is in dark mode instead of being derived from the light one; it still moves only if its label would fall
  below AA, and `adjusted` reports that. Light mode is unchanged.
- `@senvenli/cli`: `--primary-dark <color>`.
- `@senvenli/mcp`: `primaryDark` on `create_theme` and `validate_theme`.
- `@senvenli/react`: no API change; released at the same version as the others.

## 0.1.0 (2026-11-25)

The first public release, all four packages at the same version.

- `@senvenli/react`: 103 components in 12 families on React Aria Components and Tailwind v4, each with a JSON
  manifest (props with origin, usage, guidance, accessibility, tokens). ESM with explicit file extensions, so it loads
  in Node for SSR as well as in bundlers.
- `@senvenli/tokens`: the theme engine (up to three colors → light and dark tokens, 128 WCAG AA pairs), CSS and native
  hex output, preset codes, and `checkThemeCss` for a hand-edited theme.
- `@senvenli/cli`: `npx @senvenli/cli theme [preset] [--primary …] [--tailwind] [--native] [--out file]`.
- `@senvenli/mcp`: an MCP server (stdio and Streamable HTTP) with 7 read-only tools, 2 prompts and every component and
  doc as a resource.
