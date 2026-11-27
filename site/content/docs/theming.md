---
title: Theming
description: Zero to three colors and a few layout settings in, a full light and dark theme out.
group: Get started
order: 2
---

A theme starts from a handful of inputs. The engine derives everything else and checks every text and border pair against WCAG AA, in light and in dark.

## Inputs

All of them are optional.

| Input | What it sets |
| --- | --- |
| `primary` | The brand color: primary buttons, selection, focus, links, the first chart series. |
| `secondary`, `tertiary` | Two more brand roles, for secondary fills and accents. |
| `success`, `warning`, `danger`, `info` | Status colors, if yours differ from the defaults. |
| `darkColors` | Hand-picked colors for dark mode per role, such as `{ primary: "#c99a2e" }`. Without one, dark is derived from the light color. A given color is used as-is unless its label would fall below AA. |
| `radius` | The base corner radius in rem (default `0.375`, 6px). Every radius steps from it: 2, 4, 6, 8 and 12px by default. |
| `controlShape` | `rounded` (default) or `pill`. With `pill`, single-line controls (buttons, fields, selects, badges, segmented controls, pill tabs, toggles) are fully round; cards, panels and multi-line fields keep `radius`. |
| `density` | `compact`, `default` or `comfortable`: control heights and spacing. |
| `borderWidth` | `0`, `1` or `2` pixels for field and card borders. |
| `fontSans`, `fontMono` | Font stacks. The default is Geist. |

Leave the colors out and you get the neutral theme: soft black (`#0c0c0b`) and white (`#fcfcfb`), never pure.

## What is derived

From each color the engine derives the bold fill, its hover and pressed steps, the label that sits on it (paper or ink, whichever reads), a subtle tint for selection, the text color for links and brand text, and the mark used for borders, focus and chart lines. In dark mode a given color is lifted so fills stand out on the dark page.

When a color cannot carry its label at AA, the engine moves its lightness until it does and keeps the hue. The theme builder shows when that happened: "Moved to #… so text on it passes AA."

## Contrast

Every theme reports its checks: 132 pairs, each with its ratio. The builder lists them under **See pairs**. A failing pair is a bug in the engine, not something to tune by hand.

## Themes in code

To build a theme at run time (one per customer, say), use the engine directly:

```ts
import { createTheme, toCSS } from "@senvenli/tokens";

const theme = createTheme({ primary: "#1268ae", radius: 0.5 });
const css = toCSS(theme, { tailwind: true });
const failing = theme.checks.filter((check) => !check.pass);
```

Put the CSS in a `<style>` element. It replaces the default variables, so every component follows at once.

## Preset codes

A preset code is a short string for a set of inputs. The builder puts it in the share link (`/create?p=…`), and the CLI reads it:

```bash
npx @senvenli/cli theme <preset-code> --tailwind
```

## Defaults for the whole app

Size and corner radius can be set once, for every component that has them. A component's own prop always wins:

```tsx
<DesignSystemProvider locale="en" defaults={{ size: "small", radius: "full", motion: "reduce" }}>
  <App />
</DesignSystemProvider>
```

- `size`: `small`, `medium` (the design) or `large`. Fields come in small and medium; `large` reads as medium for them.
- `radius`: `none`, `small`, `medium`, `large` or `full`. Buttons, fields (their frames), selects, cards and badges follow it; without it, each keeps its designed corner.
- `motion`: `auto` (the default) follows the device's "reduce motion" setting; `reduce` keeps fades and state changes but no movement; `none` turns every transition and animation off. No value can bring motion back for someone whose device asks for less.

The theme's own radius (the builder's slider) scales every step at once; `radius` picks which step a component uses.

## Motion for one part

Dialogs, drawers, popovers, menus, tooltips, tabs, accordions, the sidebar, carousels, skeletons and progress bars take their own `motion`; any region can be wrapped in `MotionScope`:

```tsx
<Drawer title="Filters" motion="none">…</Drawer>

<MotionScope motion="reduce">
  <Dashboard />
</MotionScope>
```

