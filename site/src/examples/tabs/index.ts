import type { ExampleMeta } from "../types";

export default [
  { id: "views", title: "Views of one record", description: "Short nouns; a count can follow a label." },
  { id: "composed", title: "Composed from parts", description: "`TabList`, `Tab` and `TabPanel` as children: an icon in a label, panels built from your own components." },
  { id: "variants", title: "Variants and sizes", description: "`underline` (default), `pills` and `outline`; `size` small, medium or large." },
  { id: "vertical", title: "Vertical", description: "`orientation=\"vertical\"`: the tabs in a column beside the panel; arrows go up and down." },
  { id: "controlled", title: "Controlled", description: "The app owns the selected tab, for example to keep it in the URL." },
  { id: "segmented-control", title: "SegmentedControl", description: "A small set of options switched inline, with no panels of its own." },
] satisfies ExampleMeta[];
