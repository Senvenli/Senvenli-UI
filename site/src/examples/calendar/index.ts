import type { ExampleMeta } from "../types";

export default [
  { id: "fixed-month", title: "A chosen day", description: "The selected day sets the month that opens." },
  { id: "this-month", title: "This month", description: "No value: it opens on the visitor's month, so it renders in the browser only." },
] satisfies ExampleMeta[];
