import type { ExampleMeta } from "../types";

export default [
  { id: "list", title: "A list page", description: "`width=\"full\"` gives a wide table the room; the header and each section sit 32px apart." },
  { id: "default-width", title: "Default width", description: "1200px at most: dashboards and record pages." },
  { id: "narrow", title: "A narrow page", description: "800px at most, for a form or settings that read as one column." },
] satisfies ExampleMeta[];
