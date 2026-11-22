---
title: Agents and AI
description: Every page as Markdown and JSON, llms.txt, and an MCP server on the way.
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

## MCP server (planned)

An MCP server will let an agent search components, read their pages and examples, and generate themes, both locally (`npx @senvenli/mcp`) and hosted.

## Generative UI (planned)

A curated catalog of these components will render from a JSON spec a model writes, themed and accessible.
