# Senvenli UI

A generic, themeable design system for React.

- **Neutral by default.** With no configuration you get calm black-and-white tones (`#fcfcfb` / `#0c0c0b`).
- **Theme with a few inputs.** Give an optional `primary`, `secondary` and `tertiary` color, plus layout settings (radius, density, border width, font). Everything else is derived for you, including the dark theme, hover and pressed states, text on colored surfaces, and borders. Every text pair meets WCAG AA.
- **Native apps share the colors.** The theme engine also emits plain hex tokens, so native iOS and Android apps can use the same palette with their platform look.
- **Built for AI agents.** An MCP server lets coding agents search components, read docs and generate themes.

## Packages

| Package | What it is | Status |
|---|---|---|
| [`@senvenli/tokens`](packages/tokens) | Platform-neutral theme engine: inputs → tokens → CSS / native hex theme | v0, working |
| [`@senvenli/react`](packages/react) | Web components (React Aria Components + Tailwind v4) | Scaffold: provider, strings, base CSS; components being extracted |
| [`@senvenli/cli`](packages/cli) | `senvenli-ui theme <code>` writes your theme files | v0, working |
| [`@senvenli/mcp`](packages/mcp) | MCP server for AI-agent development | Planned |
| [`site`](site) | Docs site and theme builder (design.senvenli.com) | Preview |

## Development

```sh
pnpm install
pnpm test        # unit tests, including the AA contrast sweep
pnpm dev         # theme builder preview at http://localhost:5173
```

## License

[MIT](LICENSE)
