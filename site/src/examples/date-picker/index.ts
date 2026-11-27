import type { ExampleMeta } from "../types";

export default [
  { id: "delivery-date", title: "A date with a calendar", description: "Type the date, or open the calendar to browse." },
  { id: "unavailable-days", title: "Unavailable days and markers", description: "Closed days stay visible and say why; a dot marks days worth a look." },
  { id: "bounds", title: "With a range", description: "Days outside `minValue` and `maxValue` cannot be picked or typed." },
  { id: "month", title: "A month", description: "For a report period: the popover is a grid of months." },
  { id: "spanish", title: "In Spanish", description: "The locale names the months and days and orders the date; the label is yours." },
  { id: "arabic", title: "In Arabic, right to left", description: "`dir=\"rtl\"` mirrors the field and the calendar; digits follow the locale." },
  { id: "range-report-period", title: "A range: A period", description: "Start and end in one control over one calendar." },
  { id: "range-presets", title: "A range: Quick ranges", description: "`presets` beside the calendar (chips on phones): picking one sets the dates and reports its id for the URL; dates changed by hand report `null`." },
  { id: "range-with-times", title: "A range: With times", description: "`granularity=\"hour\"` adds a start and an end time." },
  { id: "range-with-a-total", title: "A range: Named halves and a total", description: "Your own labels for the two halves, and a figure beside the day count under the calendar." },
] satisfies ExampleMeta[];
