import type { ExampleMeta } from "../types";

export default [
  { id: "paragraph", title: "A paragraph", description: "`elementType=\"p\"` gives body copy its semantics and a readable line length." },
  { id: "sizes", title: "Sizes", description: "Body by default; large for lead text, small for captions, code for identifiers." },
  { id: "heading-accent", title: "Accent in a heading", description: "`size=\"inherit\"` colours part of a heading in a tone at the heading's own size, weight and line height." },
  { id: "tones", title: "Tones", description: "Subtle tones for secondary text; semantic tones only when the text carries that meaning." },
  { id: "prose", title: "Long-form text", description: "Prose styles rendered HTML or Markdown: headings, lists, quotes, code and links." },
] satisfies ExampleMeta[];
