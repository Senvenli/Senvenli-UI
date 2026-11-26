import { formatHex, formatOklch } from "./color.js";
import type { Layout, ModeTokens, Theme } from "./theme.js";

/** Base spacing steps in px (scaled by density). */
const SPACE: Array<[string, number]> = [
  ["0", 0],
  ["025", 2],
  ["050", 4],
  ["075", 6],
  ["100", 8],
  ["150", 12],
  ["200", 16],
  ["250", 20],
  ["300", 24],
  ["400", 32],
  ["500", 40],
  ["600", 48],
  ["800", 64],
  ["1000", 80],
];

/** Control and row heights in px (scaled by density); icon sizes stay fixed. */
const SIZE: Array<[string, number, boolean]> = [
  ["control-compact", 32, true],
  ["control", 36, true],
  ["control-large", 44, true],
  ["row-compact", 36, true],
  ["row", 48, true],
  ["icon-small", 12, false],
  ["icon", 16, false],
  ["icon-large", 20, false],
];

/** Radius steps as multiples of the base ("medium") radius. */
const RADIUS: Array<[string, number]> = [
  ["xsmall", 1 / 3],
  ["small", 2 / 3],
  ["medium", 1],
  ["large", 4 / 3],
  ["xlarge", 2],
];

/** The radius steps single-line controls use; each has a `ds-radius-control-*` twin. */
const CONTROL_STEPS = ["xsmall", "small", "medium"];

const px = (n: number) => `${Math.round(n * 2) / 2}px`;
const rem = (n: number) => `${Number(n.toFixed(4))}rem`;

/** Layout variables: `[name, value]` pairs, shared by CSS and native output. */
export function layoutTokens(layout: Layout): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (const [name, value] of SPACE) out.push([`ds-space-${name}`, px(value * layout.spacingScale)]);
  for (const [name, value, scales] of SIZE) out.push([`ds-size-${name}`, px(scales ? value * layout.spacingScale : value)]);
  for (const [name, factor] of RADIUS) out.push([`ds-radius-${name}`, rem(layout.radius * factor)]);
  out.push(["ds-radius-full", "9999px"]);
  // Single-line controls: the same step as above, or fully round with `controlShape: "pill"`.
  for (const [name, factor] of RADIUS.filter(([step]) => CONTROL_STEPS.includes(step))) {
    out.push([`ds-radius-control-${name}`, layout.controlShape === "pill" ? "9999px" : rem(layout.radius * factor)]);
  }
  out.push(["ds-border-width", `${layout.borderWidth}px`]);
  return out;
}

function colorVars(tokens: ModeTokens): string {
  return Object.entries(tokens)
    .map(([name, value]) => `  --${name}: ${formatOklch(value)};`)
    .join("\n");
}

export interface CssOptions {
  /** Also emit the Tailwind v4 `@theme inline` block (bg-ds-surface, p-ds-200, rounded-ds-medium…). */
  tailwind?: boolean;
}

const LIGHT_SELECTOR = ':root, [data-theme="light"]';
const DARK_SELECTOR = '[data-theme="dark"], .dark';

/** CSS custom properties for light and dark mode, optionally with the Tailwind mapping. */
export function toCSS(theme: Theme, options: CssOptions = {}): string {
  const layout = layoutTokens(theme.layout)
    .map(([name, value]) => `  --${name}: ${value};`)
    .join("\n");
  const fonts = `  --font-sans: ${theme.layout.fontSans};\n  --font-mono: ${theme.layout.fontMono};`;
  let css = `${LIGHT_SELECTOR} {\n${layout}\n${fonts}\n${colorVars(theme.light)}\n}\n\n${DARK_SELECTOR} {\n${colorVars(theme.dark)}\n}\n`;
  if (options.tailwind) {
    const lines: string[] = [];
    for (const name of Object.keys(theme.light)) lines.push(`  --color-${name}: var(--${name});`);
    for (const [name] of layoutTokens(theme.layout)) {
      if (name.startsWith("ds-space-")) lines.push(`  --spacing-ds-${name.slice(9)}: var(--${name});`);
      else if (name.startsWith("ds-size-")) lines.push(`  --spacing-ds-${name.slice(8)}: var(--${name});`);
      // A control radius falls back to its plain step, so a theme.css generated before control radii keeps its corners.
      else if (name.startsWith("ds-radius-control-")) lines.push(`  --radius-ds-${name.slice(10)}: var(--${name}, var(--ds-radius-${name.slice(18)}));`);
      else if (name.startsWith("ds-radius-")) lines.push(`  --radius-ds-${name.slice(10)}: var(--${name});`);
    }
    lines.push("  --font-ds-sans: var(--font-sans);", "  --font-ds-mono: var(--font-mono);");
    css += `\n@theme inline {\n${lines.join("\n")}\n}\n`;
  }
  return css;
}

export interface NativeTheme {
  /** `#rrggbb` (or `#rrggbbaa` for translucent tokens), keyed by token name. */
  light: Record<string, string>;
  dark: Record<string, string>;
  /** Layout values as strings with units (px / rem), keyed by token name. */
  layout: Record<string, string>;
  fontSans: string;
  fontMono: string;
}

/** Hex colors and layout values for native apps (iOS, Android) or any non-CSS consumer. */
export function toNative(theme: Theme): NativeTheme {
  const hexes = (tokens: ModeTokens) => Object.fromEntries(Object.entries(tokens).map(([n, v]) => [n, formatHex(v)]));
  return {
    light: hexes(theme.light),
    dark: hexes(theme.dark),
    layout: Object.fromEntries(layoutTokens(theme.layout)),
    fontSans: theme.layout.fontSans,
    fontMono: theme.layout.fontMono,
  };
}
