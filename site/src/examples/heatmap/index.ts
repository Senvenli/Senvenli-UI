import type { ExampleMeta } from "../types";

export default [
  { id: "orders-by-hour", title: "Orders by weekday and hour", description: "Two cyclic dimensions: the busy and the quiet times stand out." },
  { id: "month", title: "A month by week", description: "Days outside the month draw no cell; a day without data is hatched, never zero." },
  { id: "retention", title: "Cohort retention in percent", description: "`scale=\"percent\"`: ratios on fixed steps that read the same across cohorts, each cell printing its percent in a color the theme checks for contrast." },
] satisfies ExampleMeta[];
