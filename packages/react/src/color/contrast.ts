// No "use client": plain functions, usable on the server (a theme API can run the same check).
import {
  AA_TEXT,
  INK,
  PAPER,
  contrast,
  createTheme,
  formatHex,
  givenTone,
  parseColor,
  type Mode,
  type OKLCH,
  type ThemeInput,
} from "@senvenli/tokens";

export type ThemeName = Mode;

/** WCAG AA for text: the action label on its fill. */
export const AA = AA_TEXT;

/** The WCAG 2 contrast ratio of two colors ("#rgb", "#rrggbb" or "oklch(…)"); 1 when either one does not parse. */
export function contrastRatio(a: string, b: string): number {
  const x = parseColor(a);
  const y = parseColor(b);
  return x && y ? contrast(x, y) : 1;
}

export type ToneCheck = {
  /** The tone measured, "#1E63D0". */
  hex: string;
  /** The label that sits on it: paper or ink, as `ds-text-on-brand`. */
  label: string;
  /** The label's contrast on the tone. */
  ratio: number;
  passes: boolean;
};

export type ThemeCheck = ToneCheck & {
  theme: ThemeName;
  /** The theme's page color (`ds-surface`), for a preview. */
  ground: string;
  /**
   * When the tone fails: the tone the theme engine uses instead for fills (same hue, lightness moved until
   * the label reaches AA). `undefined` when the tone passes.
   */
  fix: ToneCheck | undefined;
};

const hexOf = (color: OKLCH) => formatHex(color).toUpperCase();

function measure(tone: OKLCH): ToneCheck {
  const label = contrast(tone, PAPER) >= contrast(tone, INK) ? PAPER : INK;
  const ratio = contrast(tone, label);
  return { hex: hexOf(tone), label: hexOf(label), ratio, passes: ratio >= AA };
}

/**
 * A primary color checked in both themes by the theme engine itself: what `createTheme({ primary })`
 * starts from (dark mode lifts it), whether its label reaches AA, and the tone the engine uses instead when
 * it does not. `theme` is the rest of the project's theme input. `hex` is "#rgb" or "#rrggbb"; `null` when it
 * does not parse.
 */
export function checkBrandColor(hex: string, theme: Omit<ThemeInput, "primary"> = {}): Record<ThemeName, ThemeCheck> | null {
  const color = parseColor(hex);
  if (!color) return null;
  const derived = createTheme({ ...theme, primary: hex });
  const check = (mode: ThemeName): ThemeCheck => {
    const tokens = derived[mode];
    const tone = measure(givenTone({ ...color, alpha: undefined }, mode));
    const fill = tokens["ds-background-brand-bold"]!;
    const on = tokens["ds-text-on-brand"]!;
    const ratio = contrast(fill, on);
    const fix = tone.passes ? undefined : { hex: hexOf(fill), label: hexOf(on), ratio, passes: ratio >= AA };
    return { ...tone, theme: mode, ground: hexOf(tokens["ds-surface"]!), fix };
  };
  return { light: check("light"), dark: check("dark") };
}

/** "5.6:1" in the locale (one decimal, never rounded up past the AA line). */
export function formatRatio(ratio: number, locale: string): string {
  const floored = Math.floor(ratio * 10) / 10;
  return `${new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(floored)}:1`;
}
