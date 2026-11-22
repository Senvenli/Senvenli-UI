import type { ExampleMeta } from "../types";

export default [
  { id: "basic", title: "Stacked content", description: "One gap between every child, set with `space`." },
  { id: "aligned", title: "Aligned", description: "`align` places the children on the inline axis." },
  { id: "as-list", title: "As a list", description: "`as` keeps the list semantics while the stack sets the rhythm." },
  { id: "horizontal-actions", title: "Horizontal: A row of actions", description: "Short items side by side with one gap." },
  { id: "horizontal-space-between", title: "Horizontal: Space between", description: "A title at the start and its actions at the end." },
  { id: "horizontal-wrapping", title: "Horizontal: Wrapping", description: "Items move to a new line when the row runs out of room." },
] satisfies ExampleMeta[];
