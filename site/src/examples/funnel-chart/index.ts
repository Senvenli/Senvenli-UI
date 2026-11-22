import type { ExampleMeta } from "../types";

export default [
  { id: "checkout", title: "Checkout funnel", description: "Each step with its count and the conversion from the step before." },
  { id: "counts-only", title: "Counts only", description: "Without the conversions, when the absolute numbers are the point." },
] satisfies ExampleMeta[];
