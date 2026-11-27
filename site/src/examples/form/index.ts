import type { ExampleMeta } from "../types";

export default [
  { id: "customer", title: "A small form", description: "Sections with legends, a row of two fields, and one primary action in the footer." },
  { id: "validation", title: "Validation on submit", description: "An invalid field takes focus and `onSubmit` is not called; entered values are kept." },
  { id: "settings", title: "A settings page", description: "Each section a title and a line of description over a rule, then rows: label and description first, the control at the end at its own width." },
  { id: "server-errors", title: "Server errors", description: "`validationErrors` marks fields by name until the person edits them." },
] satisfies ExampleMeta[];
