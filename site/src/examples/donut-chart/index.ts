import type { ExampleMeta } from "../types";

export default [
  { id: "orders-by-channel", title: "Orders by channel", description: "A few parts of one total, with exact shares beside the ring." },
  { id: "folded", title: "More than five parts", description: "The smallest parts fold into \"Other\", so the ring stays readable." },
  { id: "ring-only", title: "Ring only", description: "Without the value list, for a narrow card." },
] satisfies ExampleMeta[];
