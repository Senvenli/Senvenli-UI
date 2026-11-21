import type { ExampleMeta } from "../types";

export default [
  { id: "list", title: "A long list in a short box", description: "`maxHeight` caps the region; a shadow shows where content continues." },
  { id: "horizontal", title: "Horizontal", description: "Wide content scrolls sideways inside its column; the parent sets the width." },
  { id: "fill", title: "Filling a pane", description: "Between a fixed header and footer, the area takes the height that is left." },
] satisfies ExampleMeta[];
