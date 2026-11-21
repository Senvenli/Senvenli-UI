import type { ExampleMeta } from "../types";

export default [
  { id: "basic", title: "Search a list", description: "The placeholder lists what can be searched; `aria-label` names the field." },
  { id: "filtering", title: "Filtering as you type", description: "Controlled: the list follows the text, and Esc or the clear button empties it." },
  { id: "with-label", title: "Label, shortcut and compact size", description: "A visible label, and a key hint shown while the field is empty." },
] satisfies ExampleMeta[];
