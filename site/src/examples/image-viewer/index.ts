import type { ExampleMeta } from "../types";

export default [
  { id: "gallery", title: "Open a gallery", description: "The viewer is open while it is mounted: render it from a trigger and unmount it on close." },
  { id: "start-at", title: "Open on a chosen photo", description: "Each trigger opens the viewer on its own photo." },
] satisfies ExampleMeta[];
