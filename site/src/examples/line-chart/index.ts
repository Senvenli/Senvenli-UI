import type { ExampleMeta } from "../types";

export default [
  { id: "orders-by-region", title: "Orders by region", description: "Three series over the same months; the third is dashed, so they differ by more than hue." },
  { id: "target", title: "With a target line", description: "A dashed reference line with its label at the end." },
  { id: "gaps", title: "Missing values", description: "A null leaves a gap; `connectNulls` joins the line across it." },
] satisfies ExampleMeta[];
