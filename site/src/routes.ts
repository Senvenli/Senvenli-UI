import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("create", "routes/create.tsx"),
  // Everything a developer reads lives under /docs (the shadcn layout): the introduction at /docs, the component list
  // at /docs/components, each component at /docs/components/<slug>, each doc at /docs/<slug>.
  route("docs", "routes/doc.tsx", { id: "docs-introduction" }),
  route("docs/components", "routes/components-index.tsx"),
  // The twins for agents: resource routes (a loader, no component), prerendered to plain files.
  // They stand before the page route, which would otherwise take "button.json" as a slug.
  route("docs/components/:slug.json", "routes/component-json.ts"),
  route("docs/components/:slug.md", "routes/component-md.ts"),
  route("docs/components/:slug", "routes/component.tsx"),
  route("docs/:slug.md", "routes/doc-md.ts"),
  route("docs/:slug", "routes/doc.tsx"),
  route("schema/component.full.json", "routes/schema-component-full.ts"),
  route("llms.txt", "routes/llms.ts"),
  // Prerendered as /404 and copied to 404.html for nginx's error_page.
  route("*", "routes/not-found.tsx"),
] satisfies RouteConfig;
