import type { ExampleMeta } from "../types";

export default [
  { id: "filters", title: "A small form under a button", description: "The title names the panel; a press outside or Esc closes it." },
  { id: "controlled", title: "Closed by its own action", description: "Controlled open state, so Apply can close the panel." },
  { id: "detail", title: "Extra detail, placed above", description: "No title: an aria-label names the panel instead." },
] satisfies ExampleMeta[];
