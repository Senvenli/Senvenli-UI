import type { ExampleMeta } from "../types";

export default [
  { id: "top-products", title: "Top products", description: "The five largest, with the rest behind \"Show all\"." },
  { id: "linked", title: "With links", description: "Each name opens its record; `limit` sets how many rows show first." },
] satisfies ExampleMeta[];
