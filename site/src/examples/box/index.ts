import type { ExampleMeta } from "../types";

export default [
  { id: "surface", title: "A padded surface", description: "Padding, ground and radius from tokens." },
  { id: "bordered", title: "With a border", description: "A divided region; `as` gives it the right element." },
  { id: "raised", title: "Raised", description: "A raised ground with its shadow, for content that floats above the page." },
] satisfies ExampleMeta[];
