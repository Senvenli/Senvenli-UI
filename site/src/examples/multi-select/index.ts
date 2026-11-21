import type { ExampleMeta } from "../types";

export default [
  { id: "channels", title: "A few options", description: "Each choice shows as a tag that can be removed." },
  { id: "select-all", title: "Select all, with collapsed tags", description: "A footer selects everything; tags past the limit fold into a count." },
  { id: "states", title: "Invalid and disabled", description: "The app's own error under the field, and a field that cannot change." },
] satisfies ExampleMeta[];
