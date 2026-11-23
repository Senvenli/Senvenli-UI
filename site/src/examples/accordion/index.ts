import type { ExampleMeta } from "../types";

export default [
  { id: "faq", title: "Questions and answers", description: "Opening one section closes the others." },
  { id: "multiple", title: "Several open at once", description: "For sections people compare; some start expanded." },
  { id: "composed", title: "Composed from Disclosures", description: "`Disclosure` children with an `id` each: a section can hold anything, here a list and a link." },
  { id: "disclosure", title: "A single Disclosure", description: "One expandable section on its own, here controlled." },
] satisfies ExampleMeta[];
