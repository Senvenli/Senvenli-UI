/**
 * The one tone vocabulary of the library: what a status, a message or an action means. A component takes the
 * subset that makes sense for it (a Banner has no `neutral`; a Progress bar no `information`), always from these
 * names, so `tone="danger"` means the same everywhere.
 */
export type Tone = "neutral" | "brand" | "information" | "success" | "warning" | "danger";
