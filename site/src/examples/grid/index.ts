import type { ExampleMeta } from "../types";

export default [
  { id: "auto-fit", title: "Auto-fit columns", description: "As many equal columns as fit, none narrower than `minColumnWidth`." },
  { id: "fixed-columns", title: "Fixed columns", description: "A set number of equal columns at every width." },
  { id: "responsive-columns", title: "Columns per breakpoint", description: "`columns={{ base: 1, md: 2 }}`: one column on phones, two from 768px; keys `base`, `sm`, `md`, `lg`, `xl`." },
  { id: "site-footer", title: "A site footer", description: "Link columns over a legal row with the language switcher, composed from Grid, Stack and Link." },
] satisfies ExampleMeta[];
