import type { ExampleMeta } from "../types";

export default [
  { id: "confirm", title: "Say what just happened", description: "Call toast() from any handler; the provider already renders the region." },
  { id: "tones", title: "Tones", description: "Success, information and danger. A danger toast stays until it is dismissed." },
  { id: "action", title: "With an action", description: "One link at most: undo a reversible step, or view the result." },
  { id: "dismiss", title: "Kept until dismissed", description: "A timeout of 0 keeps a toast until it is dismissed; its key dismisses it from code." },
  { id: "promise", title: "Following a promise", description: "`toast.promise`: a spinner while it runs, then the success or the error in place." },
] satisfies ExampleMeta[];
