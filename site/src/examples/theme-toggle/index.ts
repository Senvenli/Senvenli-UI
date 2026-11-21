import type { ExampleMeta } from "../types";

export default [
  { id: "segmented", title: "In a site header", description: "System, light or dark. It stores the choice and applies it to the page, in step with every other toggle." },
  { id: "list", title: "As a list", description: "The same choice as three rows with a check, for a phone menu." },
  { id: "controlled", title: "Controlled", description: "With `value`, the parent owns the theme: the toggle stores and applies nothing." },
] satisfies ExampleMeta[];
