import type { ExampleMeta } from "../types";

export default [
  { id: "with-name", title: "Beside a country's name", description: "The code marks the country without a flag; the name beside it is what gets read." },
  { id: "alone", title: "Standing alone", description: "Without the name beside it, a wrapper gives the chip its accessible name." },
] satisfies ExampleMeta[];
