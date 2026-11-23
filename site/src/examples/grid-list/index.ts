import type { ExampleMeta } from "../types";

export default [
  { id: "customers", title: "Rows", description: "The default `stack` layout: a title, a line of context, a visual at the start and a status at the end." },
  { id: "sections", title: "Rows in sections", description: "Rows from data, grouped under small headers." },
  { id: "selection", title: "Picking a set", description: "A checkbox per row, for acting on several at once." },
  { id: "one-open-row", title: "One open row", description: "`replace` selection with no checkboxes, for a list beside the record it opens." },
  { id: "product-photos", title: "Tiles: product photos", description: "`layout=\"grid\"`: tiles people know by their picture, picked as a set." },
  { id: "reorder", title: "Reordering", description: "Drag a tile or use its handle from the keyboard; the tile's own buttons do the same on touch." },
  { id: "documents", title: "Tiles that open", description: "An icon as the media, and a press or Enter that opens the tile." },
] satisfies ExampleMeta[];
