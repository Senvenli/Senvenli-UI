import type { ExampleMeta } from "../types";

export default [
  { id: "features", title: "A list of tags", description: "Read-only tags, some with an icon." },
  { id: "filters", title: "Removable", description: "Active filters: each tag has a remove button, and the group says when none are left." },
  { id: "selectable", title: "Selectable", description: "Tags that toggle, for picking several of a few." },
] satisfies ExampleMeta[];
