import type { ExampleMeta } from "../types";

export default [
  { id: "cover", title: "Crop to a cover photo", description: "Pan, zoom and rotate inside a 16:9 frame; saving hands back a file." },
  { id: "presets", title: "Aspect presets", description: "When one image feeds several surfaces, people choose the shape first." },
  { id: "from-file", title: "After a file is picked", description: "FileTrigger checks the type and size, then the cropper frames the picked file." },
] satisfies ExampleMeta[];
