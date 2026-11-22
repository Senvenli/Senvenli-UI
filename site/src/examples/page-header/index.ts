import type { ExampleMeta } from "../types";

export default [
  { id: "page", title: "A page's title and actions", description: "On its own, the header renders in place at the top of the page." },
  { id: "detail", title: "A detail page", description: "Breadcrumbs above the title say where the page sits." },
  { id: "bar", title: "In the shell's bar", description: "Under a provider, the page's header shows in PageHeaderBar, outside the content that scrolls." },
] satisfies ExampleMeta[];
