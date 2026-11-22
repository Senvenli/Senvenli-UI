import type { ExampleMeta } from "../types";

export default [
  { id: "details", title: "A record beside the page", description: "A title, a subtitle and the record's fields, from the inline end." },
  { id: "footer", title: "Header actions and a footer", description: "A status beside the close button, and sticky actions that close the drawer." },
  { id: "unsaved", title: "Unsaved changes", description: "Closing asks first while there are edits; saving closes without the question." },
  { id: "positions", title: "From any edge", description: "`position`: start, end (default), top or bottom; the app decides, at every width." },
  { id: "bottom", title: "From the bottom", description: "`position=\"bottom\"` is a sheet that snaps between half and full height." },
] satisfies ExampleMeta[];
