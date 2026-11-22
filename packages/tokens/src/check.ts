import { parseColor } from "./color.js";
import { checkTokens, type ContrastCheck, type Mode, type ModeTokens } from "./theme.js";

export type ThemeCssReport = {
  checks: ContrastCheck[];
  /** Tokens a checked pair needs that the CSS does not define (or defines with a value that is not a color). */
  missing: { mode: Mode; token: string }[];
};

/** The declarations of every rule whose selector list includes `selector`, in order. */
function declarations(css: string, selector: string): Map<string, string> {
  const found = new Map<string, string>();
  const rule = /([^{}]+)\{([^{}]*)\}/g;
  for (const [, selectors, body] of css.matchAll(rule)) {
    if (!selectors!.split(",").some((part) => part.trim() === selector)) continue;
    for (const [, name, value] of body!.matchAll(/--([\w-]+)\s*:\s*([^;]+);?/g)) found.set(name!, value!.trim());
  }
  return found;
}

function tokensFrom(values: Map<string, string>): ModeTokens {
  const tokens: ModeTokens = {};
  for (const [name, value] of values) {
    if (!name.startsWith("ds-")) continue;
    const color = parseColor(value);
    if (color) tokens[name] = color;
  }
  return tokens;
}

/**
 * Checks a theme's CSS (as `toCSS` writes it, or edited by hand) against the same contrast pairs the engine holds every
 * theme to. Light is the `:root` rule, dark the `[data-theme="dark"]` rule over it. Values must be hex or `oklch()`.
 */
export function checkThemeCss(css: string): ThemeCssReport {
  const light = declarations(css, ":root");
  for (const [name, value] of declarations(css, '[data-theme="light"]')) light.set(name, value);
  const dark = new Map(light);
  for (const [name, value] of declarations(css, '[data-theme="dark"]')) dark.set(name, value);
  const report: ThemeCssReport = { checks: [], missing: [] };
  for (const [mode, values] of [["light", light], ["dark", dark]] as const) {
    const missing = new Set<string>();
    report.checks.push(...checkTokens(mode, tokensFrom(values), missing));
    for (const token of missing) report.missing.push({ mode, token });
  }
  return report;
}
