# @senvenli/react

Web components built on React Aria Components and Tailwind v4, themed by [`@senvenli/tokens`](../tokens).

Status: scaffold. Components are being extracted family by family from an existing production library: display, action, layout, feedback, form, selection, overlay, navigation, date, color, collection and charts.

## Setup

```css
@import "tailwindcss";
@import "./theme.css"; /* from `npx senvenli-ui theme <code> --tailwind` or the theme builder */
@import "@senvenli/react/base.css";
```

```tsx
import { DesignSystemProvider } from "@senvenli/react";

<DesignSystemProvider locale="en" navigate={router.push}>
  <App />
</DesignSystemProvider>;
```

## Languages

Component strings ship in English. Add another language once at startup:

```ts
import { registerDsStrings } from "@senvenli/react";

registerDsStrings("tr", { close: "Kapat", optional: "(isteğe bağlı)" });
```

Anything not registered falls back to English. Right-to-left layout follows the locale.
