import type { ExampleMeta } from "../types";

export default [
  { id: "customers", title: "Customers", description: "One line of title, one of context, a visual at the start and a status at the end." },
  { id: "sections", title: "With sections", description: "Rows from data, grouped under small headers." },
  { id: "selection", title: "Picking a set", description: "A checkbox per row, for acting on several at once." },
  { id: "one-open-row", title: "One open row", description: "`replace` selection with no checkboxes, for a list beside the record it opens." },
] satisfies ExampleMeta[];
