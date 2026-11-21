import type { ExampleMeta } from "../types";

export default [
  { id: "status", title: "A short list", description: "One option from a handful, under a visible label." },
  { id: "grouped", title: "Groups, descriptions and details", description: "Options under headers, with a second line and a right-aligned detail." },
  { id: "compact", title: "Compact", description: "The 32px size for table filters and toolbars, named by aria-label." },
  { id: "states", title: "Invalid and disabled", description: "An error under the field, and a field that cannot change." },
] satisfies ExampleMeta[];
