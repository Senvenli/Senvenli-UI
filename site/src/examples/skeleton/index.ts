import type { ExampleMeta } from "../types";

export default [
  { id: "list", title: "A loading list", description: "Shapes mirror the rows they stand for; SkeletonGroup names the busy region." },
  { id: "loaded", title: "Swapping in the content", description: "`isLoaded` shows the children in place of the shape." },
  { id: "card", title: "A card with a photo", description: "`aspectRatio` holds the photo's box, and `radius` matches what it replaces." },
] satisfies ExampleMeta[];
