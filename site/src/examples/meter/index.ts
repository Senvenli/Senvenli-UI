import type { ExampleMeta } from "../types";

export default [
  { id: "usage", title: "Usage against a limit", description: "A value and its maximum, shown as “value / max”." },
  { id: "thresholds", title: "Warning and critical", description: "Past a threshold the segments and the value text change color; the value label says it in words too." },
  { id: "low-end", title: "When low is bad", description: "`badEnd=\"low\"` warns as the value runs out." },
] satisfies ExampleMeta[];
