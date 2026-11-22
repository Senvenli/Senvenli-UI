---
title: Introduction
description: A themeable React design system, built on React Aria, that checks its own colors.
group: Get started
order: 0
---

Senvenli UI is a set of accessible React components and a theme engine. You give it up to three colors, or none; it derives the whole theme for light and dark and checks every text and border pair against WCAG AA before you ever see it.

It is not a template. The components are generic building blocks: a `Split`, a `Form`, a `Card`, a `DataTable`. A sign-in page, a settings screen or a dashboard is something you compose from them, and the examples show how.

## Principles

- **Generic over specific.** A component earns its place when many products need it. A flow that one product needs is an example built from the generic parts, so you can change any piece of it.
- **Accessible by construction.** Every interactive component is built on [React Aria](https://react-spectrum.adobe.com/react-aria/): keyboard, focus, screen readers, right-to-left and touch work without extra props.
- **Themed with a few inputs.** Brand colors, radius, density and border width are the whole theme. Hover, pressed, dark mode and text on colored surfaces are derived, and contrast is checked, not hoped for.
- **Tokens, not values.** Components read `--ds-*` variables only. Your Tailwind classes use the same tokens (`bg-ds-surface`, `text-ds-text-subtle`), so your own screens follow the theme too.
- **Readable by agents.** Every page has a Markdown and a JSON twin, and an MCP server answers questions about components and themes.

## What is in it

| Package | What it is |
| --- | --- |
| `@senvenli/react` | The components, in families: display, action, layout, feedback, form, selection, overlay, navigation, date, color, collection and charts. |
| `@senvenli/tokens` | The theme engine. It comes with `@senvenli/react`. |
| `@senvenli/cli` | Writes your theme file from the command line. |
| `@senvenli/mcp` | The MCP server for coding agents. |

## Where to start

- [Getting started](/docs/getting-started): install, add a theme, set up Tailwind and wrap your app.
- [Components](/docs/components): every component with live examples, guidelines and its API.
- [Create a theme](/create): pick colors and see the whole library change.
- [Agents and AI](/docs/agents): the Markdown twins, llms.txt and the MCP server.
