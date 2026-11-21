import type { ExampleMeta } from "../types";

export default [
  { id: "presets", title: "Preset colors", description: "One choice from a few named colors; the caption names the selected one." },
  { id: "custom", title: "With a custom color", description: "The last button opens a color picker for a color outside the presets." },
] satisfies ExampleMeta[];
