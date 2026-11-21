import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("create", "routes/create.tsx"),
  route("components", "routes/components-index.tsx"),
  // The twins for agents: resource routes (a loader, no component), prerendered to plain files.
  // They stand before the page route, which would otherwise take "button.json" as a slug.
  route("components/:slug.json", "routes/component-json.ts"),
  route("components/:slug.md", "routes/component-md.ts"),
  route("schema/component.full.json", "routes/schema-component-full.ts"),
  route("components/:slug", "routes/component.tsx"),
  route("docs/:slug", "routes/doc.tsx"),
  // Prerendered as /404 and copied to 404.html for nginx's error_page.
  route("*", "routes/not-found.tsx"),
] satisfies RouteConfig;
