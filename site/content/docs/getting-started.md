---
title: Getting started
description: Install the package, add a theme, set up Tailwind and wrap your app.
group: Get started
order: 1
---

Senvenli UI is a React design system built on React Aria. It works with Tailwind v4 and any React framework.

## Install

```bash
npm i @senvenli/react
```

`@senvenli/react` brings its theme engine, `@senvenli/tokens`, with it.

## Add a theme

A theme is a CSS file of `--ds-*` variables for light and dark. Get one of these two ways:

- **From the theme builder.** Open [Create a theme](/create), pick up to three colors or keep the neutral default, then choose **Get code** and copy the CSS.
- **From the command line.** The builder's preset code, or the colors themselves, write the same file:

```bash
npx @senvenli/cli theme --primary "#1268ae" --tailwind --out src/theme.css
```

Leave every color out for the neutral, soft black-and-white theme.

`npm i` installs a package into your project; `npx` runs a package's command once without adding it. The library is installed, the theme command is only run. With other package managers: `pnpm dlx @senvenli/cli …`, `yarn dlx @senvenli/cli …`, `bunx @senvenli/cli …`.

## Set up Tailwind

Import Tailwind, your theme, and the library's type scale and base styles. Tell Tailwind to read the library's classes:

```css
@import "tailwindcss";
@import "./theme.css";
@import "@senvenli/react/theme.css";
@import "@senvenli/react/base.css";
@source "../node_modules/@senvenli/react/dist";
```

## Wrap your app

`DesignSystemProvider` sets the locale for dates, numbers and the components' own strings, and mounts the toast region. Pass your router's `navigate` so the library's links route without a full page load:

```tsx
import { DesignSystemProvider } from "@senvenli/react";
import { useNavigate } from "react-router";

export function App({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  return (
    <DesignSystemProvider locale="en" navigate={navigate}>
      {children}
    </DesignSystemProvider>
  );
}
```

## Use a component

Components are grouped by family, each with its own import path:

```tsx
import { Button } from "@senvenli/react/action";
import { TextField } from "@senvenli/react/form";

export function Profile() {
  return (
    <form>
      <TextField label="Full name" />
      <Button type="submit" variant="primary">Save changes</Button>
    </form>
  );
}
```

## Next

- [Theming](/docs/theming): what the inputs do and how the rest is derived.
- [Dark mode](/docs/dark-mode): light, dark and the visitor's choice without a flash.
- [Components](/components): every component with live examples and its API.
