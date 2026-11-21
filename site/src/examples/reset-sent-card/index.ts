import type { ExampleMeta } from "../types";

export default [
  { id: "check-inbox", title: "Check your inbox", description: "The message never says whether the account exists; resend waits out its cooldown." },
  { id: "with-back-link", title: "With a way back", description: "A shorter cooldown, a pending resend and a link back to sign in." },
] satisfies ExampleMeta[];
