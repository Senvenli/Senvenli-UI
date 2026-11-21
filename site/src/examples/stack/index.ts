import type { ExampleMeta } from "../types";

export default [
  { id: "basic", title: "Stacked content", description: "One gap between every child, set with `space`." },
  { id: "aligned", title: "Aligned", description: "`align` places the children on the inline axis." },
  { id: "as-list", title: "As a list", description: "`as` keeps the list semantics while the stack sets the rhythm." },
] satisfies ExampleMeta[];
