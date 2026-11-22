import type { ExampleMeta } from "../types";

export default [
  { id: "ratio", title: "A fixed shape", description: "`ratio` keeps the box while the picture loads, so the page never jumps." },
  { id: "fallback", title: "When it cannot load", description: "A neutral tile with an icon, still named by the alt text." },
] satisfies ExampleMeta[];
