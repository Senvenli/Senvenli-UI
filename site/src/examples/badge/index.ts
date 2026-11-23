import type { ExampleMeta } from "../types";

export default [
  { id: "status", title: "A record's status", description: "`subtle` (the default): one or two words in sentence case; the word carries the meaning, never the color alone." },
  { id: "tones", title: "Tones", description: "One meaning per tone, across the whole product." },
  { id: "bold", title: "Bold", description: "`variant=\"bold\"` for the one status on the screen that needs attention now." },
  { id: "with-dot", title: "With a dot", description: "A dot in the pill marks a live state." },
  { id: "dot-tones", title: "Dot: a live state", description: "`variant=\"dot\"`: a dot and a word, for a system state (connected, syncing)." },
  { id: "dot-live", title: "Dot and live", description: "`isLive` adds a halo for a state that is active right now." },
  { id: "dot-only", title: "Dot without a word", description: "Only where a visible word is impossible; `aria-label` names the state." },
  { id: "count", title: "A count beside a label", description: "`variant=\"count\"`: nothing renders at zero; above `max` it reads \"99+\"." },
  { id: "count-tones", title: "Count tones", description: "Neutral by default; danger only for counts that need action now." },
  { id: "on-icon", title: "A count on an icon", description: "The badge is hidden from screen readers, so the button's name carries the count." },
  { id: "unread", title: "Unread dot", description: "`variant=\"count\"` with no `value`: a marker without a number; the text beside it says what is new." },
  { id: "code-with-name", title: "A code: Beside a country's name", description: "The code marks the country without a flag; the name beside it is what gets read." },
  { id: "code-alone", title: "A code: Standing alone", description: "Without the name beside it, a wrapper gives the chip its accessible name." },
] satisfies ExampleMeta[];
