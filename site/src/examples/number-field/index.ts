import type { ExampleMeta } from "../types";

export default [
  { id: "quantity", title: "A quantity", description: "The stepper suits small whole numbers; the range is stated up front." },
  { id: "currency", title: "Money", description: "`currency` adds the symbol and keeps the currency's decimals." },
  { id: "units", title: "Units and percentages", description: "A suffix for a unit, or `formatOptions` when Intl can print it." },
] satisfies ExampleMeta[];
