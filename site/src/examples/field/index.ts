import type { ExampleMeta } from "../types";

export default [
  { id: "native-control", title: "Around a native control", description: "The row gives a control the library does not provide its label and hint, and wires both to it." },
  { id: "with-input-group", title: "Around an input group", description: "The label, hint and error reach the group's input, not its frame." },
  { id: "with-error", title: "With an error", description: "The error replaces the hint and marks the control invalid; a library control draws that state itself." },
] satisfies ExampleMeta[];
