import type { ExampleMeta } from "../types";

export default [
  { id: "tile", title: "A pressable tile", description: "A custom surface that is one button; `aria-pressed` says which one is chosen." },
  { id: "link-row", title: "A row that is a link", description: "With `href` the whole row navigates." },
  { id: "disabled", title: "Disabled", description: "Dimmed, and it takes no press or focus." },
] satisfies ExampleMeta[];
