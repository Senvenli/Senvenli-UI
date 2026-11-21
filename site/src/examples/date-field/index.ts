import type { ExampleMeta } from "../types";

export default [
  { id: "delivery-date", title: "A typed date", description: "Segments in the locale's order; arrow keys step each one." },
  { id: "bounds", title: "With a range", description: "`minValue` and `maxValue` bound what can be typed; a date outside says so." },
  { id: "month-and-year", title: "Month and year", description: "A card's expiry: no day, and the value is the month's first day." },
  { id: "day-and-month", title: "Day and month", description: "A yearly date with no year, such as a birthday reminder." },
] satisfies ExampleMeta[];
