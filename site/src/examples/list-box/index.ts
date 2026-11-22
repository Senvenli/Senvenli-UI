import type { ExampleMeta } from "../types";

export default [
  { id: "single", title: "One choice, in place", description: "The options stay visible; the chosen one is marked." },
  { id: "multiple", title: "Several", description: "`selectionMode=\"multiple\"`: Space toggles an option." },
] satisfies ExampleMeta[];
