# @senvenli/tokens

The Senvenli UI theme engine. A few optional inputs (up to three brand colors, radius, control shape, density, border width) become
a full token set for light and dark, with every text and border pair checked against WCAG AA.

```ts
import { createTheme, toCSS, toNative, checkThemeCss } from "@senvenli/tokens";

const theme = createTheme({ primary: "#1268ae" });
theme.checks.every((check) => check.pass); // true: 128 pairs, light and dark
toCSS(theme, { tailwind: true }); // the theme.css an app imports
toNative(theme); // hex colors for iOS and Android
checkThemeCss(editedCss); // the same checks on a theme.css edited by hand
```

`@senvenli/react` installs it; most apps write their theme with the CLI (`npx @senvenli/cli theme`) or the builder at
https://design.senvenli.com/create. Docs: https://design.senvenli.com/docs/theming.
