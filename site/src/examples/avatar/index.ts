import type { ExampleMeta } from "../types";

export default [
  { id: "people", title: "People", description: "Initials from the name, a photo when there is one, and an online dot." },
  { id: "sizes", title: "Sizes", description: "Small in dense rows, medium by default, large on a profile." },
  { id: "company", title: "A company", description: "Squares are for companies and logos; circles are for people." },
  { id: "group", title: "A group", description: "Past `max`, the rest fold into a count." },
] satisfies ExampleMeta[];
