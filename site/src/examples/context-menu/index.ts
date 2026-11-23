import type { ExampleMeta } from "../types";

export default [
  { id: "row", align: "stretch", title: "On a row", description: "Right-click, long-press, or Shift+F10 on the focused button." },
  { id: "composed", align: "stretch", title: "Composed from parts", description: "A `ContextMenuTrigger` holds the region; the parts after it are the menu." },
] satisfies ExampleMeta[];
