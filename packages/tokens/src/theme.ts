import { contrast, parseColor, toGamut, type OKLCH } from "./color.js";

/** Brand roles a project may color. All optional: the default is neutral. */
export const BRAND_ROLES = ["primary", "secondary", "tertiary"] as const;
/** Status roles. They ship with defaults and can be overridden. */
export const STATUS_ROLES = ["success", "warning", "danger", "info"] as const;
export const ROLES = [...BRAND_ROLES, ...STATUS_ROLES] as const;

export type BrandRole = (typeof BRAND_ROLES)[number];
export type StatusRole = (typeof STATUS_ROLES)[number];
export type Role = (typeof ROLES)[number];

export type Density = "compact" | "default" | "comfortable";
export type BorderWidth = 0 | 1 | 2;

/**
 * What a project gives. Every field is optional; an empty object is the
 * neutral default theme. Colors accept `#rrggbb`, `#rgb` or `oklch(L C H)`.
 */
export interface ThemeInput {
  primary?: string;
  secondary?: string;
  tertiary?: string;
  success?: string;
  warning?: string;
  danger?: string;
  info?: string;
  /** Base corner radius in rem. Default 0.625. */
  radius?: number;
  density?: Density;
  borderWidth?: BorderWidth;
  fontSans?: string;
  fontMono?: string;
}

export const NEUTRAL_TOKENS = [
  "background",
  "foreground",
  "surface",
  "surface-foreground",
  "muted",
  "muted-foreground",
  "border",
  "input",
  "focus",
] as const;

export const ROLE_SUFFIXES = ["", "-foreground", "-hover", "-soft", "-soft-foreground"] as const;

export type TokenName =
  | (typeof NEUTRAL_TOKENS)[number]
  | `${Role}${(typeof ROLE_SUFFIXES)[number]}`;

export type ModeTokens = Record<TokenName, OKLCH>;

export interface ContrastCheck {
  mode: "light" | "dark";
  foreground: TokenName;
  background: TokenName;
  ratio: number;
  required: number;
  pass: boolean;
}

export interface Layout {
  radius: number;
  density: Density;
  spacingScale: number;
  borderWidth: BorderWidth;
  fontSans: string;
  fontMono: string;
}

export interface Theme {
  input: ThemeInput;
  light: ModeTokens;
  dark: ModeTokens;
  layout: Layout;
  /** Roles whose given color was moved to reach AA; the raw value is kept in `input`. */
  adjusted: Role[];
  checks: ContrastCheck[];
}

/** WCAG AA thresholds. */
export const AA_TEXT = 4.5;
export const AA_NON_TEXT = 3;

const hex = (value: string): OKLCH => {
  const parsed = parseColor(value);
  if (!parsed) throw new Error(`invalid built-in color ${value}`);
  return parsed;
};

/** The soft black and white every default derives from. Never pure #000/#fff. */
export const PAPER = hex("#fcfcfb");
export const INK = hex("#0c0c0b");
const NEUTRAL_HUE = PAPER.h;

const neutral = (l: number, c = 0.0015): OKLCH => ({ l, c, h: NEUTRAL_HUE });

const STATUS_DEFAULTS: Record<StatusRole, OKLCH> = {
  success: { l: 0.52, c: 0.13, h: 150 },
  warning: { l: 0.78, c: 0.15, h: 78 },
  danger: { l: 0.55, c: 0.2, h: 27 },
  info: { l: 0.52, c: 0.14, h: 250 },
};

export const DEFAULT_LAYOUT: Layout = {
  radius: 0.625,
  density: "default",
  spacingScale: 1,
  borderWidth: 1,
  fontSans: '"Geist", ui-sans-serif, system-ui, sans-serif',
  fontMono: '"Geist Mono", ui-monospace, SFMono-Regular, monospace',
};

const DENSITY_SCALE: Record<Density, number> = { compact: 0.875, default: 1, comfortable: 1.125 };

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/**
 * Move `color`'s lightness in `direction` until it reaches `required` contrast
 * against `against`. Hue and chroma are kept (chroma shrinks only through
 * gamut mapping). Returns the first passing color.
 */
function solveLightness(color: OKLCH, against: OKLCH, required: number, direction: 1 | -1): OKLCH {
  let current = toGamut(color);
  for (let i = 0; i < 200 && contrast(current, against) < required; i++) {
    const l = clamp(current.l + direction * 0.005, 0, 1);
    current = toGamut({ ...color, l });
    if (l === 0 || l === 1) break;
  }
  return current;
}

/** Pick the readable foreground (paper or ink) for a fill; nudge the fill if neither reaches AA. */
function fillWithForeground(fill: OKLCH): { fill: OKLCH; foreground: OKLCH } {
  const f = toGamut(fill);
  const onPaper = contrast(f, PAPER);
  const onInk = contrast(f, INK);
  const foreground = onPaper >= onInk ? PAPER : INK;
  if (Math.max(onPaper, onInk) >= AA_TEXT) return { fill: f, foreground };
  // Paper text wants a darker fill; ink text wants a lighter one.
  const solved = solveLightness(f, foreground, AA_TEXT, foreground === PAPER ? -1 : 1);
  return { fill: solved, foreground };
}

/**
 * Hover state: a small lightness step toward the middle (light fills darken,
 * dark fills lighten), kept at AA and never reaching pure black or white.
 */
function hoverOf(fill: OKLCH, foreground: OKLCH): OKLCH {
  const preferred = fill.l > 0.6 ? -1 : 1;
  for (const step of [0.06, 0.045, 0.03, 0.015]) {
    for (const dir of [preferred, -preferred] as const) {
      const candidate = toGamut({ ...fill, l: clamp(fill.l + dir * step, 0.1, 0.985) });
      if (contrast(candidate, foreground) >= AA_TEXT) return candidate;
    }
  }
  return fill;
}

interface ModeContext {
  mode: "light" | "dark";
  background: OKLCH;
  tokens: Partial<ModeTokens>;
}

function deriveRole(
  ctx: ModeContext,
  role: Role,
  given: OKLCH | null,
  base: OKLCH,
): { adjusted: boolean } {
  const light = ctx.mode === "light";
  const t = ctx.tokens;
  let fill: OKLCH;
  let foreground: OKLCH;
  let adjusted = false;

  if (!given && (role === "primary" || role === "secondary" || role === "tertiary")) {
    // Neutral defaults (shadcn-neutral-like).
    if (role === "primary") {
      fill = light ? neutral(0.22, 0.002) : neutral(0.93);
      foreground = light ? PAPER : INK;
    } else {
      fill = light ? neutral(role === "secondary" ? 0.94 : 0.955) : neutral(role === "secondary" ? 0.28 : 0.25);
      foreground = light ? INK : PAPER;
    }
  } else {
    const source = given ?? base;
    const wanted = light ? source : { ...source, l: clamp(source.l, 0.62, 0.86) };
    const solved = fillWithForeground(wanted);
    fill = solved.fill;
    foreground = solved.foreground;
    adjusted = light && given !== null && Math.abs(solved.fill.l - toGamut(given).l) > 0.004;
  }

  const hue = (given ?? base).h;
  const chroma = given || STATUS_ROLES.includes(role as StatusRole) ? (given ?? base).c : 0.0015;
  const soft = toGamut(
    light ? { l: 0.955, c: Math.min(chroma, 0.035), h: hue } : { l: 0.26, c: Math.min(chroma, 0.045), h: hue },
  );
  const softForeground = solveLightness(
    light ? { l: 0.42, c: Math.min(chroma, 0.16), h: hue } : { l: 0.84, c: Math.min(chroma, 0.12), h: hue },
    soft,
    AA_TEXT,
    light ? -1 : 1,
  );

  t[role] = fill;
  t[`${role}-foreground`] = foreground;
  t[`${role}-hover`] = hoverOf(fill, foreground);
  t[`${role}-soft`] = soft;
  t[`${role}-soft-foreground`] = softForeground;
  return { adjusted };
}

function deriveMode(mode: "light" | "dark", colors: Partial<Record<Role, OKLCH>>, adjusted: Set<Role>): ModeTokens {
  const light = mode === "light";
  const background = light ? PAPER : INK;
  const foreground = light ? INK : neutral(0.96);
  const t: Partial<ModeTokens> = {};
  t.background = background;
  t.foreground = foreground;
  t.surface = light ? neutral(0.997, 0.0008) : neutral(0.19);
  t["surface-foreground"] = foreground;
  t.muted = light ? neutral(0.955) : neutral(0.25);
  // Muted text must read on both the page and muted surfaces.
  const mutedText = solveLightness(neutral(light ? 0.52 : 0.7), t.muted, AA_TEXT, light ? -1 : 1);
  t["muted-foreground"] = solveLightness(mutedText, background, AA_TEXT, light ? -1 : 1);
  t.border = light ? neutral(0.915) : neutral(0.28);
  t.input = light ? neutral(0.885) : neutral(0.33);

  const ctx: ModeContext = { mode, background, tokens: t };
  for (const role of ROLES) {
    const base = STATUS_DEFAULTS[role as StatusRole] ?? neutral(0.5);
    const result = deriveRole(ctx, role, colors[role] ?? null, base);
    if (result.adjusted) adjusted.add(role);
  }

  // Focus is the border color a focused control takes: the primary color,
  // moved until it is 3:1 against the page.
  const focusStart = colors.primary ? (t.primary as OKLCH) : foreground;
  t.focus = solveLightness(focusStart, background, AA_NON_TEXT, light ? -1 : 1);
  return t as ModeTokens;
}

function checksFor(mode: "light" | "dark", t: ModeTokens): ContrastCheck[] {
  const pairs: Array<[TokenName, TokenName, number]> = [
    ["foreground", "background", AA_TEXT],
    ["surface-foreground", "surface", AA_TEXT],
    ["muted-foreground", "background", AA_TEXT],
    ["muted-foreground", "muted", AA_TEXT],
    ["focus", "background", AA_NON_TEXT],
  ];
  for (const role of ROLES) {
    pairs.push([`${role}-foreground`, role, AA_TEXT]);
    pairs.push([`${role}-foreground`, `${role}-hover`, AA_TEXT]);
    pairs.push([`${role}-soft-foreground`, `${role}-soft`, AA_TEXT]);
  }
  return pairs.map(([fg, bg, required]) => {
    const ratio = contrast(t[fg], t[bg]);
    return { mode, foreground: fg, background: bg, ratio, required, pass: ratio >= required };
  });
}

/** Normalize input: drop unknown or invalid values so the theme is always valid. */
export function normalizeInput(input: ThemeInput = {}): { input: ThemeInput; colors: Partial<Record<Role, OKLCH>> } {
  const clean: ThemeInput = {};
  const colors: Partial<Record<Role, OKLCH>> = {};
  for (const role of ROLES) {
    const raw = input[role];
    const parsed = parseColor(raw);
    if (raw && parsed) {
      clean[role] = raw.trim();
      colors[role] = parsed;
    }
  }
  if (typeof input.radius === "number" && Number.isFinite(input.radius)) clean.radius = clamp(input.radius, 0, 2);
  if (input.density && input.density in DENSITY_SCALE) clean.density = input.density;
  if (input.borderWidth === 0 || input.borderWidth === 1 || input.borderWidth === 2) clean.borderWidth = input.borderWidth;
  if (input.fontSans?.trim()) clean.fontSans = input.fontSans.trim();
  if (input.fontMono?.trim()) clean.fontMono = input.fontMono.trim();
  return { input: clean, colors };
}

/** Build a complete theme from (possibly empty) input. */
export function createTheme(raw: ThemeInput = {}): Theme {
  const { input, colors } = normalizeInput(raw);
  const adjusted = new Set<Role>();
  const light = deriveMode("light", colors, adjusted);
  const dark = deriveMode("dark", colors, adjusted);
  const density = input.density ?? DEFAULT_LAYOUT.density;
  const layout: Layout = {
    radius: input.radius ?? DEFAULT_LAYOUT.radius,
    density,
    spacingScale: DENSITY_SCALE[density],
    borderWidth: input.borderWidth ?? DEFAULT_LAYOUT.borderWidth,
    fontSans: input.fontSans ?? DEFAULT_LAYOUT.fontSans,
    fontMono: input.fontMono ?? DEFAULT_LAYOUT.fontMono,
  };
  return {
    input,
    light,
    dark,
    layout,
    adjusted: ROLES.filter((r) => adjusted.has(r)),
    checks: [...checksFor("light", light), ...checksFor("dark", dark)],
  };
}
