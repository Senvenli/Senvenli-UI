import type { ExampleMeta } from "../types";

export default [
  { id: "checkout", title: "A flow on one page", description: "Done steps are pressable, so people can go back." },
  { id: "checklist", title: "A vertical checklist", description: "Each step has a line of detail: onboarding, setup." },
  { id: "journey", title: "A journey with statuses", description: "Steps that wait on someone or failed say so in words and an icon." },
  { id: "complete", title: "Finished", description: "With isComplete every step shows done and none is current." },
] satisfies ExampleMeta[];
