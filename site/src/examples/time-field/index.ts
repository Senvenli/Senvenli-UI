import type { ExampleMeta } from "../types";

export default [
  { id: "opening-time", title: "A typed time", description: "The locale's clock: 12-hour with AM and PM in English." },
  { id: "steps", title: "Minute steps and a 24-hour clock", description: "Arrow keys move the minutes a quarter of an hour at a time." },
  { id: "time-zone", title: "In another time zone", description: "The zone is named after the time when it differs from the visitor's, so the label appears once the page runs in the browser." },
] satisfies ExampleMeta[];
