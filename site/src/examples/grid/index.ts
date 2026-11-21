import type { ExampleMeta } from "../types";

export default [
  { id: "auto-fit", title: "Auto-fit columns", description: "As many equal columns as fit, none narrower than `minColumnWidth`." },
  { id: "fixed-columns", title: "Fixed columns", description: "A set number of equal columns at every width." },
] satisfies ExampleMeta[];
