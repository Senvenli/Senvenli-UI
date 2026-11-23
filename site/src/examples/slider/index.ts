import type { ExampleMeta } from "../types";

export default [
  { id: "volume", title: "One value", description: "The value is always shown in text beside the label." },
  { id: "range", title: "A range", description: "Two thumbs and a formatted output: a price filter." },
  { id: "steps", title: "Steps and a disabled slider", description: "A coarse step with a unit, and a value that cannot change." },
  { id: "sizes", title: "Sizes", description: "`size` small, medium (default) or large: the thumb and the bar." },
] satisfies ExampleMeta[];
