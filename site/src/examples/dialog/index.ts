import type { ExampleMeta } from "../types";

export default [
  { id: "edit", title: "A focused task", description: "A title, a few fields, one primary action; Cancel closes." },
  { id: "form", title: "Submitting a form", description: "The primary action submits the form by its id, so Enter in a field works too." },
  { id: "sizes", title: "Sizes", description: "Small by default; medium, large and xlarge for wider content." },
  { id: "fullscreen", title: "Full screen", description: "For a long task: the header and footer stay put, Back and Continue spread apart." },
] satisfies ExampleMeta[];
