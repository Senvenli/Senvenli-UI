# Senvenli UI

A generic, themeable design system for React.

- **Neutral by default.** With no configuration you get calm black-and-white tones (`#fcfcfb` / `#0c0c0b`).
- **Theme with a few inputs.** Give an optional `primary`, `secondary` and `tertiary` color, plus layout settings (radius, density, border width, font). Everything else is derived for you, including the dark theme, hover and pressed states, text on colored surfaces, and borders. Every text pair meets WCAG AA.
- **Native apps share the colors.** The theme engine also emits plain hex tokens, so native iOS and Android apps can use the same palette with their platform look.
- **Built for AI agents.** An MCP server lets coding agents search components, read docs and generate themes.

## Packages

| Package | What it is |
|---|---|
| [`@senvenli/react`](packages/react) | 112 web components on React Aria and Tailwind v4, with machine-readable manifests |
| [`@senvenli/tokens`](packages/tokens) | The theme engine: inputs → AA-checked tokens → CSS or native hex. Installed with `@senvenli/react` |
| [`@senvenli/cli`](packages/cli) | `npx @senvenli/cli theme` writes your theme files |
| [`@senvenli/mcp`](packages/mcp) | MCP server for coding agents: components, docs and themes |
| [`site`](site) | Docs, component pages and the theme builder (design.senvenli.com) |

Releasing: see [RELEASE.md](RELEASE.md).

## Install

```sh
npm i @senvenli/react
```

Then follow [Getting started](site/content/docs/getting-started.md): add a theme, set up Tailwind, wrap the app in `DesignSystemProvider`.

## Development

```sh
pnpm install
pnpm test        # unit tests, including the AA contrast sweep
pnpm dev         # the site at http://localhost:5173
```

## License

[MIT](LICENSE)
