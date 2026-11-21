import type { ExampleMeta } from "../types";

export default [
  { id: "filters", title: "Filters that combine", description: "A group where any number of buttons can be on." },
  { id: "single-choice", title: "One choice", description: "With `selectionMode=\"single\"` the group behaves as a radio group." },
  { id: "controlled", title: "A single toggle, controlled", description: "The label stays the same; only the pressed state changes." },
  { id: "compact-and-disabled", title: "Compact and disabled", description: "Compact for dense toolbars; a disabled toggle keeps its state." },
] satisfies ExampleMeta[];
