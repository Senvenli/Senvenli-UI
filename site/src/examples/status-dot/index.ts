import type { ExampleMeta } from "../types";

export default [
  { id: "tones", title: "Tones", description: "A dot and a word: the color never carries the state alone." },
  { id: "live", title: "Live", description: "`isLive` adds a halo for a state that is active right now." },
  { id: "dot-only", title: "Without a word", description: "Only where a visible word is impossible; `aria-label` names the state." },
] satisfies ExampleMeta[];
