import type { ExampleMeta } from "../types";

export default [
  { id: "delete", title: "Confirm a delete", description: "The title asks, the body says what is lost, the button repeats the verb." },
  { id: "typed", title: "Typed confirmation", description: "For deletes that cannot be undone: the button enables once the name is typed." },
  { id: "tones", title: "Warning and neutral", description: "A risky step, and a confirm that neither destroys nor risks anything." },
  { id: "pending", title: "An async action", description: "The confirm button shows pending until the promise settles, then the alert closes." },
] satisfies ExampleMeta[];
