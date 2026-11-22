---
title: Agents and AI
description: Every page as Markdown and JSON, llms.txt, and an MCP server for coding agents.
group: For agents
order: 6
---

Senvenli UI is written to be read by coding agents as well as people.

## llms.txt

[/llms.txt](/llms.txt) lists every doc and every component, each with a one-line summary and a link to its Markdown.

## Every page as Markdown and JSON

Each component page has two twins:

- `/components/<name>.md`: the page as Markdown, with the examples' code, the guidelines, the accessibility notes and the API.
- `/components/<name>.json`: the component's manifest, the same data as structured fields. Its schema is at [/schema/component.full.json](/schema/component.full.json).

Each doc has a Markdown twin too: `/docs/<name>.md`. **Copy page** on a component page copies its Markdown, ready to paste into a chat.

## What a manifest holds

The JSON lists the exports and the import path, when to use the component and what to use instead, guidance, keyboard behavior, what is built in and what you provide, every prop with its type, default and origin (the library's own, React Aria's or plain DOM), and the theme tokens it reads.

## MCP server

`@senvenli/mcp` gives an agent the same pages, manifests and docs, and the theme engine, as tools. It answers from data bundled in the package: no network calls, no file writes.

| Tool | What it does |
| --- | --- |
| `search_components` | Finds components by purpose ("upload a file", "confirm a delete") or export name, best match first, with the import. |
| `list_components` | Every component, or one family. |
| `get_component` | A component's page as Markdown; `sections` reads only part of it. |
| `get_component_manifest` | The manifest as JSON: the component's own and React Aria props by default. |
| `get_doc` | A doc as Markdown. |
| `create_theme` | A theme from up to three colors, checked against WCAG AA, with the command that writes `theme.css`. |
| `validate_theme` | Checks a `theme.css`, edited or not, against WCAG AA in light and dark. |

It also has two prompts, `build_form` and `theme_app`, and every component and doc as a resource.

### Add it to your editor

Claude Code:

```bash
claude mcp add senvenli-ui -- npx -y @senvenli/mcp
```

Cursor (`.cursor/mcp.json`) and Windsurf (`~/.codeium/windsurf/mcp_config.json`):

```json
{
  "mcpServers": {
    "senvenli-ui": { "command": "npx", "args": ["-y", "@senvenli/mcp"] }
  }
}
```

VS Code (`.vscode/mcp.json`):

```json
{
  "servers": {
    "senvenli-ui": { "type": "stdio", "command": "npx", "args": ["-y", "@senvenli/mcp"] }
  }
}
```

A hosted endpoint for clients that connect over HTTP comes with the public launch.

### Tell the agent to use it

Add this to your project's `AGENTS.md` (or `CLAUDE.md`):

```md
## UI
Build UI with Senvenli UI (@senvenli/react). Before using a component, read it with the
senvenli-ui MCP tool get_component and use only the props it lists. Use ds- tokens, never raw colors.
```

## Generative UI (planned)

A curated catalog of these components will render from a JSON spec a model writes, themed and accessible.
