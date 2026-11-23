import type { ExampleMeta } from "../types";

export default [
  { id: "row-actions", title: "Actions for a row", description: "An icon-only trigger with a name; the destructive action comes last." },
  { id: "sections", title: "Sections, shortcuts and a disabled item", description: "Titled groups; a disabled item says why." },
  { id: "view-options", title: "Holding a choice", description: "A selection mode adds checkmarks: a view option that stays set." },
  { id: "composed", title: "Composed from parts", description: "`MenuItem`, `MenuSection`, `MenuSubmenu` and `MenuSeparator` as children; an item's label can hold more than text." },
  { id: "submenu", title: "With a submenu", description: "An item with children opens a second level on hover and the arrow key." },
] satisfies ExampleMeta[];
