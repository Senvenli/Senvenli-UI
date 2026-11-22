import type { ExampleMeta } from "../types";

export default [
  { id: "brand-color", title: "A brand color", description: "The picker with `checkBrandColor`: the contrast of text on it, in both themes, as it moves." },
  { id: "with-alpha", title: "With an alpha slider", description: "For a color that may be translucent, such as an overlay." },
  { id: "save-on-release", title: "Save on release", description: "`onChangeEnd` fires once per drag or commit: the place to save." },
] satisfies ExampleMeta[];
