import type { ExampleMeta } from "../types";

export default [
  { id: "orders", title: "Orders", description: "Columns as data: money aligned to the end, a status as a lozenge, two lines in one cell." },
  { id: "selection", title: "Row selection", description: "A checkbox per row and one in the header for the whole table." },
  { id: "sorting", title: "Sortable columns", description: "The table reports the sort; you sort the rows, here or on the server." },
  { id: "loading", title: "Loading", description: "`isLoading` with no rows shows skeleton lines under the header; with rows, they stay usable and dim under a bar until the new ones arrive." },
  { id: "collapse", title: "Cards on small screens", description: "`collapseBelow=\"md\"`: under 768px each row becomes a card, the row header as its title and the other columns as label–value lines. Selection and opening a row work the same." },
] satisfies ExampleMeta[];
