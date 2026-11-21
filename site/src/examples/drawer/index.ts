import type { ExampleMeta } from "../types";

export default [
  { id: "details", title: "A record beside the page", description: "A title, a subtitle and the record's fields; a bottom sheet on phones." },
  { id: "footer", title: "Header actions and a footer", description: "A status beside the close button, and sticky actions that close the drawer." },
  { id: "unsaved", title: "Unsaved changes", description: "Closing asks first while there are edits; saving closes without the question." },
  { id: "bottom", title: "From the bottom", description: "With placement=\"bottom\" it is a sheet at every width." },
] satisfies ExampleMeta[];
