import type { ExampleMeta } from "../types";

export default [
  { id: "daily-orders", title: "Orders per day", description: "Twelve weeks of days, shaded in four steps from the data's quartiles." },
  { id: "pressable", title: "Fixed steps and a press", description: "Your own thresholds keep the shading comparable between periods; a press opens the day." },
] satisfies ExampleMeta[];
