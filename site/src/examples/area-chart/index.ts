import type { ExampleMeta } from "../types";

export default [
  { id: "revenue", title: "Revenue by channel", description: "Two series over a year, summed by area." },
  { id: "goal", title: "With a goal", description: "`referenceLines` mark a target or an average; the value axis reaches a goal above the data, so it is always drawn." },
] satisfies ExampleMeta[];
