import type { ExampleMeta } from "../types";

export default [
  { id: "pages", align: "center", title: "Pages of results", description: "The range, the page numbers and previous/next. The app owns the page." },
  { id: "page-size", align: "center", title: "With a page-size choice", description: "Changing the size goes back to the first page." },
  { id: "named-range", align: "center", title: "Naming the items", description: "A formatRange function writes the range sentence; format its numbers for the locale yourself." },
] satisfies ExampleMeta[];
