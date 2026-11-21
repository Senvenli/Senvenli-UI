import type { ExampleMeta } from "../types";

export default [
  { id: "call-to-action", title: "A call to action that goes somewhere", description: "It looks like a Button and is a real link: it works before JavaScript loads." },
  { id: "external", title: "External", description: "Opens in a new tab with the arrow after the label." },
  { id: "icon-only-and-disabled", title: "Icon only, and disabled", description: "An icon-only link needs a name; a disabled one has no `href` and cannot be focused." },
  { id: "handled-in-place", title: "Handled in place", description: "`onPress` cancels a plain click so the app can respond; a modified click still follows the `href`." },
] satisfies ExampleMeta[];
