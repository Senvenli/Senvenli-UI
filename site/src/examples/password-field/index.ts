import type { ExampleMeta } from "../types";

export default [
  { id: "sign-in", title: "Signing in", description: "`current-password` lets the password manager fill it; the button shows or hides the value." },
  { id: "new-password", title: "Creating a password", description: "The requirements up front, and a strength meter while typing." },
  { id: "invalid", title: "Invalid", description: "The error says what to do next." },
] satisfies ExampleMeta[];
