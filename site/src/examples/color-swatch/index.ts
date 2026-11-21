import type { ExampleMeta } from "../types";

export default [
  { id: "named", title: "A named color", description: "The name is the swatch's accessible label." },
  { id: "palette", title: "Beside its value", description: "A small palette, each color with its name and hex." },
] satisfies ExampleMeta[];
