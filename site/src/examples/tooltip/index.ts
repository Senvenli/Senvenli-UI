import type { ExampleMeta } from "../types";

export default [
  { id: "icon-button", title: "Naming an icon button", description: "The same words as the button's aria-label, on hover and keyboard focus." },
  { id: "shortcut", title: "With a shortcut", description: "The key that does the same thing, as a chip." },
  { id: "placement", title: "Placement", description: "Above by default; it flips when there is no room." },
  { id: "touch", title: "Readable on touch", description: "With openOnTouch a tap opens it, for a status that has no action of its own." },
] satisfies ExampleMeta[];
