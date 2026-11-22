import type { ExampleMeta } from "../types";

export default [
  { id: "actions", title: "Actions in a view", description: "One primary action, with the quieter ones beside it; danger only confirms a destructive step." },
  { id: "with-icons", title: "With an icon", description: "An icon before or after the label, or alone with an accessible name." },
  { id: "sizes", title: "Sizes", description: "Compact for dense tables and toolbars, large for a page's main call to action." },
  { id: "states", title: "Disabled and pending", description: "A pending button keeps its width and its name while the work runs." },
  { id: "link-call-to-action", title: "As a link: A call to action that goes somewhere", description: "It looks like a Button and is a real link: it works before JavaScript loads." },
  { id: "link-external", title: "As a link: External", description: "Opens in a new tab with the arrow after the label." },
  { id: "link-icon-only-and-disabled", title: "As a link: Icon only, and disabled", description: "An icon-only link needs a name; a disabled one has no `href` and cannot be focused." },
  { id: "link-handled-in-place", title: "As a link: Handled in place", description: "`onPress` cancels a plain click so the app can respond; a modified click still follows the `href`." },
] satisfies ExampleMeta[];
