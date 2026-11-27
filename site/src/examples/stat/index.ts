import type { ExampleMeta } from "../types";

export default [
  { id: "group", title: "Key figures in a row", description: "Each change names the period it compares against; color follows whether the change is good, not its direction." },
  { id: "with-trend", title: "With a sparkline", description: "A short series under the figure shows the shape of the period." },
  { id: "select", title: "Choose the metric a chart shows", description: "selectionMode=\"single\" makes the tiles a radio group; \"multiple\" makes each a toggle. Each Stat needs an id." },
  { id: "compact", title: "Labelled rows and a compact row", description: "`label` names a row visibly; `density=\"compact\"` puts up to six secondary figures on one surface." },
  { id: "link", title: "A stat that is a link", description: "The whole tile opens the report behind the figure." },
] satisfies ExampleMeta[];
