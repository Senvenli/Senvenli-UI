import { formatHex, formatOklch } from "./color.js";
import type { ModeTokens, Theme, TokenName } from "./theme.js";

function vars(tokens: ModeTokens, indent = "  "): string {
  return (Object.keys(tokens) as TokenName[])
    .map((name) => `${indent}--${name}: ${formatOklch(tokens[name])};`)
    .join("\n");
}

export interface CssOptions {
  /** Also emit a Tailwind v4 `@theme inline` block mapping tokens to utilities. */
  tailwind?: boolean;
  /** Selector(s) that switch to dark mode. */
  darkSelector?: string;
}

/** CSS custom properties for light (`:root`) and dark mode. */
export function toCSS(theme: Theme, options: CssOptions = {}): string {
  const { layout } = theme;
  const dark = options.darkSelector ?? '.dark, [data-theme="dark"]';
  const layoutVars = [
    `  --radius: ${layout.radius}rem;`,
    `  --spacing: ${Number((0.25 * layout.spacingScale).toFixed(4))}rem;`,
    `  --border-width: ${layout.borderWidth}px;`,
    `  --font-sans: ${layout.fontSans};`,
    `  --font-mono: ${layout.fontMono};`,
  ].join("\n");
  let css = `:root {\n${layoutVars}\n${vars(theme.light)}\n}\n\n${dark} {\n${vars(theme.dark)}\n}\n`;
  if (options.tailwind) {
    const names = Object.keys(theme.light) as TokenName[];
    css += `\n@theme inline {\n${names.map((n) => `  --color-${n}: var(--${n});`).join("\n")}\n`;
    css += [
      "  --radius-sm: calc(var(--radius) * 0.6);",
      "  --radius-md: calc(var(--radius) * 0.8);",
      "  --radius-lg: var(--radius);",
      "  --radius-xl: calc(var(--radius) * 1.4);",
      "  --font-sans: var(--font-sans);",
      "  --font-mono: var(--font-mono);",
    ].join("\n");
    css += "\n}\n";
  }
  return css;
}

export interface NativeTheme {
  light: Record<TokenName, string>;
  dark: Record<TokenName, string>;
  /** Pixels, assuming 1rem = 16px. */
  radius: number;
  spacing: number;
  borderWidth: number;
  fontSans: string;
  fontMono: string;
}

/** Hex colors and pixel values for native apps (iOS, Android) or any non-CSS consumer. */
export function toNative(theme: Theme): NativeTheme {
  const hexes = (tokens: ModeTokens) =>
    Object.fromEntries((Object.keys(tokens) as TokenName[]).map((n) => [n, formatHex(tokens[n])])) as Record<TokenName, string>;
  return {
    light: hexes(theme.light),
    dark: hexes(theme.dark),
    radius: Math.round(theme.layout.radius * 16),
    spacing: 4 * theme.layout.spacingScale,
    borderWidth: theme.layout.borderWidth,
    fontSans: "Geist",
    fontMono: "GeistMono",
  };
}
