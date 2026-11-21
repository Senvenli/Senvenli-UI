import type { ExampleMeta } from "../types";

export default [
  { id: "company", title: "Free text with suggestions", description: "Any text is a valid value; a suggestion only fills it in." },
  { id: "grouped", title: "Grouped, with icons", description: "Suggestions under headers, in the order the groups prop gives." },
  { id: "required", title: "Required", description: "Left empty, the field reports itself on blur." },
] satisfies ExampleMeta[];
