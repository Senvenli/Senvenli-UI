import type { ExampleMeta } from "../types";

export default [
  { id: "delivery-date", title: "A date with a calendar", description: "Type the date, or open the calendar to browse." },
  { id: "unavailable-days", title: "Unavailable days and markers", description: "Closed days stay visible and say why; a dot marks days worth a look." },
  { id: "bounds", title: "With a range", description: "Days outside `minValue` and `maxValue` cannot be picked or typed." },
  { id: "month", title: "A month", description: "For a report period: the popover is a grid of months." },
] satisfies ExampleMeta[];
