import type { ExampleMeta } from "../types";

export default [
  { id: "customer", title: "Pick one from a long list", description: "Type to filter; the second line is searched too." },
  { id: "multiple", title: "Several items", description: "Chosen items become removable tags in the field." },
  { id: "create", title: "Create a missing item", description: "A create row appears when nothing matches the text exactly." },
  { id: "server", title: "Loaded from the server", description: "A loadItems function fetches matches as people type and pages by cursor." },
] satisfies ExampleMeta[];
