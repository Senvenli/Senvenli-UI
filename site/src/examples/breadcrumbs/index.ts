import type { ExampleMeta } from "../types";

export default [
  { id: "trail", align: "center", title: "Where the page sits", description: "From the section root to the current page, which is not a link." },
  { id: "long", align: "center", title: "A long trail", description: "With more than four levels, the middle ones fold into a menu." },
  { id: "composed", title: "Composed from parts", description: "`Breadcrumb` children with icons; the last one is the current page." },
] satisfies ExampleMeta[];
