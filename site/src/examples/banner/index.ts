import type { ExampleMeta } from "../types";

export default [
  { id: "information", title: "A section message", description: "What happened in the title, why and what to do beneath it, and up to two link actions." },
  { id: "tones", title: "Tones", description: "The icon and the title say the status; a danger banner is announced as an alert." },
  { id: "dismissible", title: "Dismissible", description: "`onDismiss` adds the close button. Leave it out for errors that must be resolved." },
  { id: "floating", title: "Floating", description: "Pinned to the bottom of the viewport until the visitor acts on it, like a cookie notice." },
] satisfies ExampleMeta[];
