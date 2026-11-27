import type { ExampleMeta } from "../types";

export default [
  { id: "orders", title: "Orders", description: "Columns as data: money aligned to the end, a status as a lozenge, two lines in one cell." },
  { id: "selection", title: "Row selection", description: "A checkbox per row and one in the header for the whole table." },
  { id: "sorting", title: "Sortable columns", description: "The table reports the sort; you sort the rows, here or on the server." },
  { id: "loading", title: "Loading", description: "`isLoading` with no rows shows skeleton lines under the header; with rows, they stay usable and dim under a bar until the new ones arrive." },
] satisfies ExampleMeta[];
