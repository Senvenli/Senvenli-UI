import type { ExampleMeta } from "../types";

export default [
  { id: "single", title: "One option", description: "A single box, written positively, with a line of detail." },
  { id: "group", title: "A group", description: "Several options under one legend." },
  { id: "select-all", title: "Indeterminate parent", description: "A parent box shows a minus while only some of its options are checked." },
  { id: "states", title: "Invalid and disabled", description: "The error sits under the label; disabled options keep their value." },
  { id: "sizes", title: "Sizes", description: "`size` small, medium (default) or large; a CheckboxGroup sets it for its boxes." },
] satisfies ExampleMeta[];
