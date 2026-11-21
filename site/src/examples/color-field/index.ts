import type { ExampleMeta } from "../types";

export default [
  { id: "brand-color", title: "A hex color", description: "Typed with or without the #; the swatch follows as you type." },
  { id: "controlled", title: "Controlled", description: "`onChange` gives the normalized hex, or null when the field is emptied." },
  { id: "channel", title: "A single channel", description: "The field types one channel's number instead of the hex." },
] satisfies ExampleMeta[];
