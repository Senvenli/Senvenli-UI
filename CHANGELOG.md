# Changelog

## 0.1.0 (unreleased)

The first public release, all four packages at the same version.

- `@senvenli/react`: 108 components in 12 families on React Aria Components and Tailwind v4, each with a JSON
  manifest (props with origin, usage, guidance, accessibility, tokens). ESM with explicit file extensions, so it loads
  in Node for SSR as well as in bundlers.
- `@senvenli/tokens`: the theme engine (up to three colors → light and dark tokens, 128 WCAG AA pairs), CSS and native
  hex output, preset codes, and `checkThemeCss` for a hand-edited theme.
- `@senvenli/cli`: `npx @senvenli/cli theme [preset] [--primary …] [--tailwind] [--native] [--out file]`.
- `@senvenli/mcp`: an MCP server (stdio and Streamable HTTP) with 7 read-only tools, 2 prompts and every component and
  doc as a resource.
