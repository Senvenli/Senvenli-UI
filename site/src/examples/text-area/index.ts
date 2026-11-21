import type { ExampleMeta } from "../types";

export default [
  { id: "basic", title: "Longer text", description: "Grows with its content, then scrolls." },
  { id: "character-limit", title: "With a limit", description: "`maxLength` shows the count; text past it is kept and marks the field invalid." },
  { id: "invalid", title: "Invalid", description: "The error says what is missing." },
] satisfies ExampleMeta[];
