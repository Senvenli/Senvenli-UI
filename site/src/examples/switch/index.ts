import type { ExampleMeta } from "../types";

export default [
  { id: "setting", title: "A setting", description: "Named by its on-state; it applies at once." },
  { id: "saving", title: "Saved by the app", description: "Controlled, with a description that reports the state." },
  { id: "disabled", title: "Disabled", description: "A setting that cannot change, on and off." },
  { id: "sizes", title: "Sizes", description: "`size` small, medium (default) or large." },
] satisfies ExampleMeta[];
