import type { ExampleMeta } from "../types";

export default [
  { id: "count", title: "A count beside a label", description: "Nothing renders at zero; above `max` it reads \"99+\"." },
  { id: "tones", title: "Tones", description: "Neutral by default; danger only for counts that need action now." },
  { id: "on-icon", title: "On an icon", description: "The badge is hidden from screen readers, so the button's name carries the count." },
  { id: "dot", title: "Unread dot", description: "A marker without a number; the text beside it says what is new." },
] satisfies ExampleMeta[];
