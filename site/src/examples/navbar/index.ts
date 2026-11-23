import type { ExampleMeta } from "../types";

export default [
  { id: "site", title: "A public site's top bar", description: "Brand, links and actions; under 768px the links and actions move into a menu panel." },
  { id: "composed", title: "Composed from parts", description: "`NavbarBrand`, `NavbarItem` and `NavbarActions` as children: a logo with an icon, a link with a badge." },
  { id: "languages", title: "Compact, with a language switch", description: "The 48px bar with a LanguageSwitcher among the end actions." },
] satisfies ExampleMeta[];
