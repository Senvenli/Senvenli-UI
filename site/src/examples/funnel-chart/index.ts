import type { ExampleMeta } from "../types";

export default [
  { id: "checkout", title: "Checkout funnel", description: "Each step with its count and the conversion from the step before." },
  { id: "counts-only", title: "Counts only", description: "Without the conversions, when the absolute numbers are the point." },
  { id: "groups", title: "Grouped steps from two sources", description: "`step.group` names each part; where a group starts only counts show, no step conversion. `scale=\"max\"` sizes bars against the largest step, as steps need not be subsets." },
] satisfies ExampleMeta[];
