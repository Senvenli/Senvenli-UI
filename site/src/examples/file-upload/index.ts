import type { ExampleMeta } from "../types";

export default [
  { id: "drop-zone", title: "Drop zone with a list", description: "States the accepted types and the size limit up front; rejected files say why." },
  { id: "trigger", title: "From a button", description: "FileTrigger opens the system picker from any Button." },
  { id: "rows", title: "Row states", description: "Uploaded, uploading with progress, and failed." },
] satisfies ExampleMeta[];
