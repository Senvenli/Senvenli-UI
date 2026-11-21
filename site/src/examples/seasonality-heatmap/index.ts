import type { ExampleMeta } from "../types";

export default [
  { id: "orders-by-hour", title: "Orders by weekday and hour", description: "Two cyclic dimensions: the busy and the quiet times stand out." },
  { id: "month", title: "A month by week", description: "Days outside the month draw no cell; a day without data is hatched, never zero." },
] satisfies ExampleMeta[];
