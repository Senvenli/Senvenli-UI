import type { ExampleMeta } from "../types";

export default [
  { id: "plans", title: "Plans", description: "Cards with a price and one recommended option." },
  { id: "payment", title: "With an unavailable option", description: "A disabled card stays visible and says why." },
] satisfies ExampleMeta[];
