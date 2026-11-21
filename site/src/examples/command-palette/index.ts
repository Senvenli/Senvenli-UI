import type { ExampleMeta } from "../types";

export default [
  { id: "actions", title: "Actions and pages", description: "Opened by a button; it closes when an item is chosen." },
  { id: "shortcut", title: "With ⌘K and recent items", description: "The shortcut prop binds ⌘K (Ctrl K elsewhere); recent records show while the query is empty." },
  { id: "search", title: "Records from the server", description: "The search prop finds records as people type; they show before the actions." },
] satisfies ExampleMeta[];
