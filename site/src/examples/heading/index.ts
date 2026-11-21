import type { ExampleMeta } from "../types";

export default [
  { id: "section", title: "A section title", description: "The level places it in the page outline and picks a matching size." },
  { id: "levels", title: "Levels", description: "Each level has its default size; follow the page structure and never skip a level." },
  { id: "size", title: "Size apart from level", description: "When the outline level looks too large or too small, change `size`, not the level." },
] satisfies ExampleMeta[];
