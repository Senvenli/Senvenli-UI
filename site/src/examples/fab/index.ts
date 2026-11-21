import type { ExampleMeta } from "../types";

export default [
  { id: "action", title: "A task kept in reach", description: "Fixed to the bottom corner by default; `placement=\"inline\"` keeps it in the flow, as here." },
  { id: "link", title: "A link", description: "With `href` it opens a contact or chat page, in a new tab unless `target` says otherwise." },
] satisfies ExampleMeta[];
