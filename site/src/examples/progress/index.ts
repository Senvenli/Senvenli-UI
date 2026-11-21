import type { ExampleMeta } from "../types";

export default [
  { id: "bar", title: "A known length", description: "The label says what is in progress; the value uses real units where they exist." },
  { id: "indeterminate", title: "Unknown length", description: "A segment sweeps across while the task runs." },
  { id: "tones", title: "Finished and failed", description: "`success` and `danger` close the task, each with a word in the value." },
  { id: "circle", title: "Circle", description: "ProgressCircle, for places with no width to spare." },
] satisfies ExampleMeta[];
