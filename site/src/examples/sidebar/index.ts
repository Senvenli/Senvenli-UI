import type { ExampleMeta } from "../types";

export default [
  { id: "app", title: "An app's main navigation", description: "Brand, items with a group and a badge, and the account. Under 1024px it becomes a panel that the menu button opens." },
  { id: "sections", title: "Sections, settings and a pinned account", description: "Labelled sections scroll between the brand and the account, which stay in view." },
  { id: "composed", title: "Composed from parts", description: "The same navigation built from `SidebarItem`, `SidebarSubmenu` and `SidebarSection`, with the brand and the account as `SidebarHeader` and `SidebarFooter`." },
  { id: "collapsed", title: "Collapsed to icons", description: "56px wide, labels in tooltips; the toggle at the bottom expands it." },
] satisfies ExampleMeta[];
