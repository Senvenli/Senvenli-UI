import type { ExampleMeta } from "../types";

export default [
  { id: "status", title: "A record's status", description: "One or two words in sentence case; the word carries the meaning, never the color alone." },
  { id: "tones", title: "Tones", description: "One meaning per tone, across the whole product." },
  { id: "bold", title: "Bold", description: "For the one status on the screen that needs attention now." },
  { id: "with-dot", title: "With a dot", description: "A dot marks a live state." },
] satisfies ExampleMeta[];
