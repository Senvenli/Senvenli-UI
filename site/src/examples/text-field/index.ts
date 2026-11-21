import type { ExampleMeta } from "../types";

export default [
  { id: "basic", title: "A labeled field", description: "The label sits above the field; help text goes under it." },
  { id: "affixes", title: "Prefix and suffix", description: "An icon, a unit or a URL part inside the frame." },
  { id: "invalid", title: "Invalid", description: "The error says what happened and what to do." },
  { id: "states", title: "Compact, read-only and disabled", description: "The smaller size for dense forms, and the two states a value can be locked in." },
] satisfies ExampleMeta[];
