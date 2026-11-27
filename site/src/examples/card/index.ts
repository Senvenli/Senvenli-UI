import type { ExampleMeta } from "../types";

export default [
  { id: "basic", title: "Header, body and footer", description: "Content about one object, with its actions on the footer rule." },
  { id: "with-media", title: "With a photo", description: "CardMedia sits flush to the edges at 16:9; without a `src` it shows an icon." },
  { id: "interactive", title: "A card that is a link", description: "The whole tile is one link named by its title, so it holds no other controls." },
  { id: "header-control", title: "A control in the header", description: "`actions` takes one compact control (a SegmentedControl or small Select) that switches what the card shows; on a narrow card it moves under the title." },
  { id: "variants", title: "Variants", description: "Raised on the page, outline inside another surface, sunken for summaries." },
] satisfies ExampleMeta[];
