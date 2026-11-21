import type { ExampleMeta } from "../types";

export default [
  { id: "key", title: "A key in help text", description: "One key per Kbd, in running text." },
  { id: "shortcut", title: "A shortcut", description: "ModifierKbd shows ⌘ on Apple devices and Ctrl elsewhere." },
  { id: "glyphs", title: "Glyph keys", description: "A screen reader may skip a glyph, so `label` says the key's name." },
] satisfies ExampleMeta[];
