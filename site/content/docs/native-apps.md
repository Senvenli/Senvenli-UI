---
title: Native apps
description: The same colors for iOS and Android apps, as plain hex values.
group: Guides
order: 5
---

Native apps keep their platform's components and look, and share the brand's colors. The engine writes the same theme as plain hex values.

## Get the colors

```bash
npx @senvenli/cli theme --primary "#1268ae" --native --out theme.json
```

Or choose **Get code**, then **Native**, in the [theme builder](/create).

The file has a `light` and a `dark` map from token name to hex (an excerpt), plus the layout values and fonts:

```json
{
  "light": { "ds-surface": "#fcfcfb", "ds-background-brand-bold": "#1268ae" },
  "dark": { "ds-surface": "#0c0c0b", "ds-background-brand-bold": "#3d8ad3" }
}
```

## In code

```ts
import { createTheme, toNative } from "@senvenli/tokens";

const native = toNative(createTheme({ primary: "#1268ae" }));
```

Map the tokens to your platform's color system (an asset catalog on iOS, a color resource or theme on Android) and keep the names. The contrast checks hold for the hex values as they do on the web.
