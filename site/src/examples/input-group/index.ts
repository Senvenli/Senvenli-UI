import type { ExampleMeta } from "../types";

export default [
  { id: "addons", title: "Addons around an input", description: "The frame around your own input; a press on an addon focuses it." },
  { id: "with-action", title: "With an action", description: "An icon button inside the frame; its `aria-label` names it." },
  { id: "states", title: "Invalid and disabled", description: "The frame draws the state; the input still carries it for assistive tech." },
] satisfies ExampleMeta[];
