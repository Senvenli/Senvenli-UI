import type { ExampleMeta } from "../types";

export default [
  { id: "native-control", title: "Around a native control", description: "The row gives a control the library does not provide its label and hint, and wires both to it." },
  { id: "with-error", title: "With an error", description: "The error replaces the hint and marks the control invalid; a library control draws that state itself." },
] satisfies ExampleMeta[];
