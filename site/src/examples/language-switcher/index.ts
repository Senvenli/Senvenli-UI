import type { ExampleMeta } from "../types";

export default [
  { id: "languages", title: "The product's languages", description: "Each named in the current language and sorted by that name." },
  { id: "marks", title: "With a mark", description: "A renderMark function puts a code chip (or a flag) before each name." },
  { id: "compact", title: "Compact and collapsed", description: "The small size for dense bars, and the mark alone for a collapsed rail." },
] satisfies ExampleMeta[];
