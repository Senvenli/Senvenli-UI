import type { ExampleMeta } from "../types";

export default [
  { id: "basic", title: "A tour of a screen", description: "Three steps over a toolbar: each one lights its part, then a last step with no target." },
  { id: "non-modal", title: "Without dimming", description: "mask={false}: the page stays usable while the tour is open." },
] satisfies ExampleMeta[];
