import type { ExampleMeta } from "../types";

export default [
  { id: "order", title: "A record's fields", description: "Label beside value, with a rule between rows; an empty value reads \"Not set\"." },
  { id: "stacked", title: "Stacked", description: "Label over value in columns, for summaries and cards." },
  { id: "copy-and-action", title: "Copyable values and actions", description: "A reference people paste elsewhere gets a copy button; a field may carry its own action." },
] satisfies ExampleMeta[];
