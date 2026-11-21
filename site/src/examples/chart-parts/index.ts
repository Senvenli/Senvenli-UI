import type { ExampleMeta } from "../types";

export default [
  { id: "custom-chart", title: "A custom chart", description: "A dumbbell chart drawn by hand inside the shared frame, with the shared legend, tooltip and data table." },
  { id: "empty", title: "Nothing to draw", description: "The frame keeps the chart's height and says why it is empty." },
] satisfies ExampleMeta[];
