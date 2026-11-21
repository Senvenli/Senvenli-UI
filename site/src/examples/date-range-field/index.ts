import type { ExampleMeta } from "../types";

export default [
  { id: "report-period", title: "A period", description: "Start and end in one control over one calendar." },
  { id: "with-times", title: "With times", description: "`granularity=\"hour\"` adds a start and an end time." },
  { id: "with-a-total", title: "Named halves and a total", description: "Your own labels for the two halves, and a figure beside the day count under the calendar." },
] satisfies ExampleMeta[];
