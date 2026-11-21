import type { ExampleMeta } from "../types";

export default [
  { id: "first-use", title: "First use", description: "Says what will appear here and offers the action that fills the view." },
  { id: "no-results", title: "No results", description: "Repeats the query and offers the way back." },
  { id: "compact", title: "Compact", description: "The smaller size, for a card or a table." },
  { id: "error-state", title: "A failed load", description: "ErrorState replaces the region that failed and offers a retry." },
] satisfies ExampleMeta[];
