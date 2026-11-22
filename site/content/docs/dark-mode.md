---
title: Dark mode
description: Light, dark or the device's setting, applied before the first paint.
group: Get started
order: 3
---

Every theme has a light and a dark half. The dark one applies when the root element has `data-theme="dark"` (or the `dark` class); the light one otherwise.

## Avoid a flash

Put the library's theme script in the document `<head>`. It reads the visitor's stored choice, or the device setting, and sets `data-theme` before the page paints:

```tsx
import { themeScript } from "@senvenli/react/action";

export function Head() {
  return <head>{themeScript()}</head>;
}
```

Pass a `nonce` if your Content Security Policy needs one: `themeScript(nonce)`.

## Let people choose

`ThemeToggle` offers System, Light and Dark, stores the choice and applies it:

```tsx
import { ThemeToggle } from "@senvenli/react/action";

export function Header() {
  return <ThemeToggle />;
}
```

To read the current mode in your own code, use `useThemePreference()`. It returns the choice and the resolved mode, `light` or `dark`.

## Storage

The choice is kept in `localStorage` under `ds-theme`. Both `themeScript` and `ThemeToggle` take a different key if you need one.
