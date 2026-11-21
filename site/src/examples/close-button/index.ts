import type { ExampleMeta } from "../types";

export default [
  { id: "default", title: "Close", description: "Named \"Close\" in the reader's language, with nothing to pass." },
  { id: "named", title: "A specific name", description: "When several close buttons share a view, each says what it closes." },
] satisfies ExampleMeta[];
