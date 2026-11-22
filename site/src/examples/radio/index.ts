import type { ExampleMeta } from "../types";

export default [
  { id: "billing", title: "Options as data", description: "A few choices that all stay visible." },
  { id: "descriptions", title: "With descriptions", description: "Radio children, each with a line of detail; one is unavailable." },
  { id: "horizontal", title: "Horizontal", description: "Short options on one line; they wrap when space runs out." },
  { id: "plans", title: "Cards", description: "`variant=\"card\"`: each option a card, its content yours (a name, a Lozenge, a price)." },
  { id: "time-slots", title: "Time slots", description: "Cards as a time picker; a taken time stays visible, disabled, with its reason." },
] satisfies ExampleMeta[];
