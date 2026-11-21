import type { ExampleMeta } from "../types";

export default [
  { id: "photos", title: "Product photos", description: "Previous and next, dots, arrow keys and swipe; it never advances by itself." },
  { id: "thumbnails", title: "With thumbnails", description: "A strip under the frame picks an image directly; the dots then only indicate." },
  { id: "controlled", title: "Controlled", description: "The page owns the shown image, here to caption it." },
] satisfies ExampleMeta[];
