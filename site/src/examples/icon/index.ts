import type { ExampleMeta } from "../types";

export default [
  { id: "with-text", title: "Beside text", description: "Next to a label the icon is decorative and takes the text color." },
  { id: "sizes", title: "Sizes", description: "Small at 12px, default at 16px and large at 20px." },
  { id: "colors", title: "Semantic colors", description: "Only when the icon carries that meaning, and always with the word." },
  { id: "labelled", title: "Standing alone", description: "Without text beside it, `label` gives the icon its accessible name." },
] satisfies ExampleMeta[];
