import type { ExampleMeta } from "../types";

export default [
  { id: "basic", title: "A phone number", description: "Opens on `defaultCountry`; the suggested countries lead the list." },
  { id: "controlled", title: "Controlled", description: "The value is E.164; `onChange` also gives the chosen country." },
  { id: "invalid", title: "Invalid", description: "The error says what a full number looks like." },
] satisfies ExampleMeta[];
