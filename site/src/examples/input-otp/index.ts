import type { ExampleMeta } from "../types";

export default [
  { id: "six-digits", title: "A six-digit code", description: "One real input, so a pasted or autofilled code fills every box; `onComplete` runs on the last digit." },
  { id: "with-resend", title: "Four digits with resend", description: "The resend action waits out its cooldown before it can be pressed." },
  { id: "invalid", title: "A wrong code", description: "The error says what to do next." },
] satisfies ExampleMeta[];
