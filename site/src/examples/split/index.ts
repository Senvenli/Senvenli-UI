import type { ExampleMeta } from "../types";

export default [
  {
    id: "sign-in",
    title: "A sign-in screen",
    description: "A brand pane beside the form, left out when the layout is narrow; `SplitShow when=\"stacked\"` puts a compact brand above the form there only. A real screen adds `fullHeight`.",
  },
  { id: "list-detail", title: "List and detail", description: "A fixed-width list beside the item it opens; stacked when narrow." },
] satisfies ExampleMeta[];
