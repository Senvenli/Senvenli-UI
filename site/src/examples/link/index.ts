import type { ExampleMeta } from "../types";

export default [
  { id: "default", title: "A link to a page", description: "The text names the destination and makes sense on its own." },
  { id: "inline", title: "In running text", description: "Always underlined, so it is found without relying on color." },
  { id: "external", title: "External", description: "Opens in a new tab, shows the arrow and tells screen readers so." },
  { id: "subtle", title: "Subtle", description: "For footers and legal rows, where links should not compete with content." },
] satisfies ExampleMeta[];
