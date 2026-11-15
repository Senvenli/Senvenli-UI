/**
 * Dependency-free color math: sRGB <-> OKLab/OKLCH (Björn Ottosson's
 * matrices), WCAG 2.x contrast, and parsing of the color formats a theme
 * accepts (hex and oklch()).
 */

export type RGB = { r: number; g: number; b: number }; // 0..1
export type OKLCH = { l: number; c: number; h: number }; // l 0..1, c >= 0, h degrees

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function linearToSrgb(c: number): number {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

export function rgbToOklch({ r, g, b }: RGB): OKLCH {
  const rl = srgbToLinear(r);
  const gl = srgbToLinear(g);
  const bl = srgbToLinear(b);
  const l = Math.cbrt(0.4122214708 * rl + 0.5363325363 * gl + 0.0514459929 * bl);
  const m = Math.cbrt(0.2119034982 * rl + 0.6806995451 * gl + 0.1073969566 * bl);
  const s = Math.cbrt(0.0883024619 * rl + 0.2817188376 * gl + 0.6299787005 * bl);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  let h = (Math.atan2(bb, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { l: L, c: Math.sqrt(a * a + bb * bb), h };
}

/** Linear sRGB for an OKLCH color, unclamped (may fall outside 0..1). */
function oklchToLinear({ l: L, c, h }: OKLCH): [number, number, number] {
  const hr = (h * Math.PI) / 180;
  const a = c * Math.cos(hr);
  const b = c * Math.sin(hr);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const EPS = 0.000_5;

export function inGamut(color: OKLCH): boolean {
  return oklchToLinear(color).every((ch) => ch >= -EPS && ch <= 1 + EPS);
}

/**
 * Bring an OKLCH color into sRGB by reducing chroma while keeping lightness
 * and hue (CSS Color 4 style binary search).
 */
export function toGamut(color: OKLCH): OKLCH {
  const l = clamp01(color.l);
  if (l <= 0 || l >= 1) return { l, c: 0, h: color.h };
  if (inGamut({ ...color, l })) return { ...color, l };
  let lo = 0;
  let hi = color.c;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut({ l, c: mid, h: color.h })) lo = mid;
    else hi = mid;
  }
  return { l, c: lo, h: color.h };
}

export function oklchToRgb(color: OKLCH): RGB {
  const [r, g, b] = oklchToLinear(toGamut(color));
  return { r: clamp01(linearToSrgb(r)), g: clamp01(linearToSrgb(g)), b: clamp01(linearToSrgb(b)) };
}

export function relativeLuminance({ r, g, b }: RGB): number {
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

/** WCAG 2.x contrast ratio between two OKLCH colors (after gamut mapping). */
export function contrast(a: OKLCH, b: OKLCH): number {
  const la = relativeLuminance(oklchToRgb(a));
  const lb = relativeLuminance(oklchToRgb(b));
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function parseHex(input: string): RGB | null {
  let h = input.slice(1);
  if (!/^[0-9a-f]+$/i.test(h)) return null;
  if (h.length === 3) h = [...h].map((ch) => ch + ch).join("");
  if (h.length !== 6) return null;
  return {
    r: Number.parseInt(h.slice(0, 2), 16) / 255,
    g: Number.parseInt(h.slice(2, 4), 16) / 255,
    b: Number.parseInt(h.slice(4, 6), 16) / 255,
  };
}

const NUMBER = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;

/**
 * Parse an opaque `#rgb`, `#rrggbb` or `oklch(L C H)` color. Returns null for
 * anything else, so bad input never reaches the stylesheet.
 */
export function parseColor(input: string | null | undefined): OKLCH | null {
  const s = input?.trim().toLowerCase();
  if (!s) return null;
  if (s.startsWith("#")) {
    const rgb = parseHex(s);
    return rgb ? rgbToOklch(rgb) : null;
  }
  const fn = s.match(/^oklch\(\s*([^)]*)\)$/);
  if (!fn?.[1]) return null;
  const parts = fn[1].split(/\s+/).filter(Boolean);
  if (parts.length !== 3) return null;
  const [lRaw, cRaw, hRaw] = parts as [string, string, string];
  const lPct = lRaw.endsWith("%");
  const lNum = lPct ? lRaw.slice(0, -1) : lRaw;
  const hNum = hRaw.replace(/deg$/, "");
  if (![lNum, cRaw, hNum].every((p) => NUMBER.test(p))) return null;
  const l = clamp01(Number(lNum) / (lPct ? 100 : 1));
  const c = Number(cRaw);
  const h = ((Number(hNum) % 360) + 360) % 360;
  if (!Number.isFinite(c) || c < 0 || c > 0.5) return null;
  return { l, c, h };
}

const round = (n: number, digits: number) => Number(n.toFixed(digits));

export function formatOklch(color: OKLCH): string {
  const g = toGamut(color);
  const c = round(g.c, 4);
  const h = c === 0 ? 0 : round(g.h, 2);
  return `oklch(${round(g.l, 4)} ${c} ${h})`;
}

export function formatHex(color: OKLCH): string {
  const { r, g, b } = oklchToRgb(color);
  const hex = (v: number) => Math.round(v * 255).toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}
