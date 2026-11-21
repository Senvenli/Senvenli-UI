import type { ExampleMeta } from "../types";

export default [
  { id: "quarterly-revenue", title: "Revenue by quarter", description: "One series against last year's, side by side." },
  { id: "stacked", title: "Stacked", description: "Parts of each period's total; at most five parts per stack." },
  { id: "horizontal", title: "Horizontal", description: "Long category names, ranked by value with the figure at the bar's end." },
  { id: "target", title: "With a target line", description: "Whole counts on the axis and a reference line to read them against." },
] satisfies ExampleMeta[];
