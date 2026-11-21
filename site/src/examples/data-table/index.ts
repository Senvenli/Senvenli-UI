import type { ExampleMeta } from "../types";

export default [
  { id: "orders", title: "Orders", description: "A client list of forty rows: search, a status filter, a column picker, paging and a bulk action." },
  { id: "server", title: "A server list", description: "`query` fetches one page for the current view; the table shows loading, empty and error states itself." },
] satisfies ExampleMeta[];
