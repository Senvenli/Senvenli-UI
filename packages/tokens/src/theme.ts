import { contrast, parseColor, rgba, toGamut, type OKLCH } from "./color.js";

/**
 * The theme engine. A project gives a few optional inputs; the engine returns
 * every semantic `ds-*` color token components use, for light and dark, with
 * WCAG AA guaranteed for every text pair it emits (3:1 for focus and
 * non-text marks).
 */

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
 * The corners of single-line controls (buttons, fields, badges, segmented controls, pill tabs, toggles):
 * `rounded` follows the base `radius`, `pill` makes them fully round while cards and panels keep the base.
 */
export type ControlShape = "rounded" | "pill";
export type Mode = "light" | "dark";

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
  /** Base corner radius in rem (the "medium" radius). Default 0.625. */
  radius?: number;
  /** Single-line controls follow `radius` (`rounded`, the default) or are fully round (`pill`). */
  controlShape?: ControlShape;
  density?: Density;
  borderWidth?: BorderWidth;
  fontSans?: string;
  fontMono?: string;
}

export type ModeTokens = Record<string, OKLCH>;

export interface ContrastCheck {
  mode: Mode;
  foreground: string;
  background: string;
  ratio: number;
  required: number;
  pass: boolean;
}

export interface Layout {
  radius: number;
  controlShape: ControlShape;
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
  /** Roles whose given color was moved to reach AA; the raw value stays in `input`. */
  adjusted: Role[];
  checks: ContrastCheck[];
}

export const AA_TEXT = 4.5;
export const AA_NON_TEXT = 3;

const hex = (value: string): OKLCH => {
  const parsed = parseColor(value);
  if (!parsed) throw new Error(`invalid built-in color ${value}`);
  return parsed;
};

/** The soft black and white the default theme is built on. Never pure #000/#fff. */
export const PAPER = hex("#fcfcfb");
export const INK = hex("#0c0c0b");
/** The lightest surface (cards, inputs): one step above the page, still not pure white. */
const WHITE = hex("#fefefd");
const DARKEST = hex("#070706");

/** Warm neutral ramp (hue ~85, near-zero chroma). */
const NEUTRAL = {
  50: PAPER,
  100: hex("#f8f8f6"),
  150: hex("#f4f3f1"),
  200: hex("#ecebe8"),
  300: hex("#e6e4e0"),
  400: hex("#a09c95"),
  500: hex("#8c8a86"),
  600: hex("#6b6964"),
  700: hex("#68645e"),
  800: hex("#3a3834"),
  850: hex("#2a2825"),
  900: hex("#1f1e1c"),
  950: hex("#161615"),
  1000: INK,
  1100: DARKEST,
} as const;

/** Status defaults: the bold fill per mode. */
const STATUS_DEFAULTS: Record<StatusRole, Record<Mode, OKLCH>> = {
  success: { light: hex("#12853e"), dark: hex("#59b972") },
  warning: { light: hex("#ea832e"), dark: hex("#ea832e") },
  danger: { light: hex("#c52c2a"), dark: hex("#c52c2a") },
  info: { light: hex("#246ec4"), dark: hex("#5da3fc") },
};

/** Which text color sits on a status bold fill (paper or ink), per mode. */
const STATUS_ON: Record<StatusRole, Record<Mode, "paper" | "ink">> = {
  success: { light: "paper", dark: "ink" },
  warning: { light: "ink", dark: "ink" },
  danger: { light: "paper", dark: "paper" },
  info: { light: "paper", dark: "ink" },
};

/** Fixed chart series 2 to 5 (series 1 follows the primary color). */
const CHARTS: Record<Mode, OKLCH[]> = {
  light: [hex("#246ec4"), hex("#009a9a"), hex("#9470cd"), hex("#c96805")],
  dark: [hex("#91c1ff"), hex("#80cecd"), hex("#c7b0f4"), hex("#f9a971")],
};

export const DEFAULT_LAYOUT: Layout = {
  radius: 0.625,
  controlShape: "rounded",
  density: "default",
  spacingScale: 1,
  borderWidth: 1,
  fontSans: '"Geist", ui-sans-serif, system-ui, sans-serif',
  fontMono: '"Geist Mono", ui-monospace, SFMono-Regular, monospace',
};

const DENSITY_SCALE: Record<Density, number> = { compact: 0.875, default: 1, comfortable: 1.125 };

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const withL = (color: OKLCH, l: number): OKLCH => toGamut({ ...color, l: clamp(l, 0, 1) });

/**
 * Move `color`'s lightness in `direction` until it reaches `required` contrast
 * against every color in `against`. Hue is kept; chroma shrinks only through
 * gamut mapping.
 */
function solve(color: OKLCH, against: OKLCH[], required: number, direction: 1 | -1): OKLCH {
  let current = toGamut(color);
  const ok = (c: OKLCH) => against.every((a) => contrast(c, a) >= required);
  for (let i = 0; i < 400 && !ok(current); i++) {
    const l = clamp(current.l + direction * 0.0025, 0, 1);
    current = withL(color, l);
    if (l === 0 || l === 1) break;
  }
  return current;
}

/**
 * A bold fill and the text that sits on it. The text is paper or ink:
 * `prefer` forces one, otherwise the higher-contrast one wins. If the text
 * does not reach AA the fill's lightness moves until it does.
 */
function boldFill(base: OKLCH, prefer?: "paper" | "ink"): { fill: OKLCH; on: OKLCH } {
  const fill = toGamut(base);
  const on = prefer ? (prefer === "paper" ? PAPER : INK) : contrast(fill, PAPER) >= contrast(fill, INK) ? PAPER : INK;
  return { fill: solve(fill, [on], AA_TEXT, on === PAPER ? -1 : 1), on };
}

/** Hover and pressed: steps away from the text color, so contrast only grows. */
function steps(fill: OKLCH, on: OKLCH): [OKLCH, OKLCH] {
  const dir = on === PAPER ? -1 : 1;
  return [withL(fill, clamp(fill.l + dir * 0.06, 0.08, 0.97)), withL(fill, clamp(fill.l + dir * 0.12, 0.06, 0.98))];
}

interface Scale {
  bold: OKLCH;
  boldHovered: OKLCH;
  boldPressed: OKLCH;
  on: OKLCH;
  subtle: OKLCH;
  subtleHovered: OKLCH;
  subtlePressed: OKLCH;
  text: OKLCH;
  textPressed: OKLCH;
  /** Non-text mark (borders, icons, chart lines): 3:1 against the page. */
  mark: OKLCH;
}

function scale(mode: Mode, base: OKLCH, surfaces: OKLCH[], prefer?: "paper" | "ink"): Scale {
  const light = mode === "light";
  const { fill: bold, on } = boldFill(base, prefer);
  const [boldHovered, boldPressed] = steps(bold, on);
  const tint = (l: number, cMax: number) => toGamut({ l, c: Math.min(base.c, cMax), h: base.h });
  const subtle = light ? tint(0.965, 0.035) : tint(0.24, 0.05);
  const subtleHovered = light ? tint(0.94, 0.04) : tint(0.28, 0.055);
  const subtlePressed = light ? tint(0.915, 0.045) : tint(0.32, 0.06);
  const dir = light ? -1 : 1;
  const text = solve(tint(light ? 0.47 : 0.8, light ? 0.16 : 0.12), [subtlePressed, ...surfaces], AA_TEXT, dir);
  const textPressed = withL(text, text.l + dir * 0.08);
  const mark = solve(bold, surfaces, AA_NON_TEXT, dir);
  return { bold, boldHovered, boldPressed, on, subtle, subtleHovered, subtlePressed, text, textPressed, mark };
}

/**
 * The tone a given color starts from in a mode, before any contrast fix. Used
 * as-is in light mode; in dark mode it is lifted so the fill stands out on the
 * dark page (e.g. gold-700 -> a brighter gold).
 */
export function givenTone(color: OKLCH, mode: Mode): OKLCH {
  return mode === "dark" ? { ...color, l: clamp(color.l, 0.62, 0.86) } : color;
}

const NEUTRAL_HUE = NEUTRAL[500].h;
const grey = (l: number): OKLCH => ({ l, c: 0.002, h: NEUTRAL_HUE });

/** Default bases for brand roles when the project gives no color. */
const BRAND_DEFAULTS: Record<BrandRole, Record<Mode, OKLCH>> = {
  primary: { light: NEUTRAL[900], dark: NEUTRAL[150] },
  secondary: { light: grey(0.42), dark: grey(0.8) },
  tertiary: { light: grey(0.55), dark: grey(0.68) },
};

function deriveMode(mode: Mode, colors: Partial<Record<Role, OKLCH>>, adjusted: Set<Role>): ModeTokens {
  const light = mode === "light";
  const t: ModeTokens = {};

  // Surfaces and neutral text.
  t["ds-surface"] = light ? NEUTRAL[50] : NEUTRAL[1000];
  t["ds-surface-sunken"] = light ? NEUTRAL[150] : NEUTRAL[1100];
  t["ds-surface-raised"] = light ? WHITE : NEUTRAL[950];
  t["ds-surface-overlay"] = light ? WHITE : NEUTRAL[900];
  t["ds-surface-hovered"] = light ? NEUTRAL[100] : NEUTRAL[850];
  t["ds-blanket"] = light ? rgba(20, 18, 15, 0.48) : rgba(7, 7, 6, 0.6);
  t["ds-text"] = light ? NEUTRAL[850] : NEUTRAL[300];
  t["ds-text-subtle"] = light ? NEUTRAL[700] : NEUTRAL[400];
  t["ds-text-subtlest"] = light ? NEUTRAL[600] : NEUTRAL[500];
  t["ds-text-disabled"] = light ? NEUTRAL[400] : NEUTRAL[700];
  t["ds-text-inverse"] = light ? WHITE : NEUTRAL[1100];
  t["ds-background-segment-selected"] = light ? WHITE : NEUTRAL[700];
  t["ds-background-neutral-subtle-hovered"] = light ? NEUTRAL[150] : NEUTRAL[850];
  t["ds-background-neutral-bold"] = light ? NEUTRAL[900] : NEUTRAL[150];
  t["ds-background-input"] = light ? WHITE : hex("#121211");
  t["ds-background-input-hovered"] = light ? NEUTRAL[50] : NEUTRAL[1000];
  t["ds-background-disabled"] = light ? NEUTRAL[150] : NEUTRAL[900];
  t["ds-border"] = light ? rgba(40, 32, 18, 0.08) : rgba(232, 228, 220, 0.07);
  t["ds-border-bold"] = light ? rgba(40, 32, 18, 0.16) : rgba(232, 228, 220, 0.14);
  t["ds-icon"] = light ? NEUTRAL[800] : NEUTRAL[300];
  t["ds-icon-subtle"] = light ? NEUTRAL[600] : NEUTRAL[500];
  t["ds-chart-neutral"] = light ? NEUTRAL[500] : NEUTRAL[600];

  const surfaces = [t["ds-surface"], t["ds-surface-raised"]] as OKLCH[];
  const given = (role: Role): OKLCH | undefined => {
    const c = colors[role];
    return c && givenTone(c, mode);
  };
  const base = (role: BrandRole) => given(role) ?? BRAND_DEFAULTS[role][mode];
  const flag = (role: Role, s: Scale, given: OKLCH | undefined) => {
    // Any lightness move by the solver (its step is 0.0025) counts as an adjustment.
    if (light && given && Math.abs(s.bold.l - toGamut(given).l) > 0.001) adjusted.add(role);
  };

  // Primary = the brand.
  const brand = scale(mode, base("primary"), surfaces);
  flag("primary", brand, colors.primary);
  t["ds-background-brand-bold"] = brand.bold;
  t["ds-background-brand-bold-hovered"] = brand.boldHovered;
  t["ds-background-brand-bold-pressed"] = brand.boldPressed;
  t["ds-text-on-brand"] = brand.on;
  t["ds-background-brand-subtle"] = brand.subtle;
  t["ds-background-selected"] = brand.subtle;
  t["ds-background-selected-hovered"] = brand.subtleHovered;
  t["ds-background-selected-pressed"] = brand.subtlePressed;
  t["ds-text-brand"] = brand.text;
  t["ds-link"] = brand.text;
  t["ds-link-pressed"] = brand.textPressed;
  t["ds-border-selected"] = brand.mark;
  t["ds-border-focused"] = brand.mark;
  t["ds-icon-brand"] = brand.mark;
  t["ds-chart-1"] = brand.mark;

  // Secondary and tertiary: their own scales.
  for (const role of ["secondary", "tertiary"] as const) {
    const s = scale(mode, base(role), surfaces);
    flag(role, s, colors[role]);
    t[`ds-background-${role}-bold`] = s.bold;
    t[`ds-background-${role}-bold-hovered`] = s.boldHovered;
    t[`ds-background-${role}-bold-pressed`] = s.boldPressed;
    t[`ds-text-on-${role}`] = s.on;
    t[`ds-background-${role}`] = s.subtle;
    t[`ds-background-${role}-hovered`] = s.subtleHovered;
    t[`ds-background-${role}-pressed`] = s.subtlePressed;
    t[`ds-text-${role}`] = s.text;
    t[`ds-border-${role}`] = s.mark;
    t[`ds-icon-${role}`] = s.mark;
  }

  // Neutral buttons: grey by default, tinted by the secondary color when given.
  const text = t["ds-text"] as OKLCH;
  if (colors.secondary) {
    const tint = (l: number) => toGamut({ l, c: Math.min(colors.secondary!.c, light ? 0.03 : 0.04), h: colors.secondary!.h });
    const dir = light ? 1 : -1; // away from the text color
    t["ds-background-neutral"] = solve(tint(light ? 0.945 : 0.25), [text], AA_TEXT, dir);
    t["ds-background-neutral-hovered"] = solve(tint(light ? 0.92 : 0.29), [text], AA_TEXT, dir);
    t["ds-background-neutral-pressed"] = solve(tint(light ? 0.895 : 0.33), [text], AA_TEXT, dir);
  } else {
    t["ds-background-neutral"] = light ? NEUTRAL[150] : NEUTRAL[850];
    t["ds-background-neutral-hovered"] = light ? NEUTRAL[200] : NEUTRAL[800];
    t["ds-background-neutral-pressed"] = light ? NEUTRAL[300] : hex("#45433f");
  }
  // New-feature callouts follow the tertiary color.
  t["ds-background-discovery"] = t["ds-background-tertiary"] as OKLCH;

  // Status.
  const statusName: Record<StatusRole, string> = { success: "success", warning: "warning", danger: "danger", info: "information" };
  for (const role of STATUS_ROLES) {
    const s = scale(mode, given(role) ?? STATUS_DEFAULTS[role][mode], surfaces, STATUS_ON[role][mode]);
    flag(role, s, colors[role]);
    const n = statusName[role];
    t[`ds-background-${n}`] = s.subtle;
    t[`ds-background-${n}-bold`] = s.bold;
    t[`ds-background-${n}-bold-hovered`] = s.boldHovered;
    t[`ds-text-${n}`] = s.text;
    t[`ds-text-on-${n}`] = s.on;
    t[`ds-border-${n}`] = s.mark;
    t[`ds-icon-${n}`] = s.mark;
  }
  // Shared label for the success and information bold fills.
  t["ds-text-on-bold"] = t["ds-text-on-success"] as OKLCH;

  // Charts.
  CHARTS[mode].forEach((c, i) => {
    t[`ds-chart-${i + 2}`] = c;
  });
  return t;
}

/** Every text pair (4.5:1) and non-text mark (3:1) the engine promises. */
/** The contrast pairs every theme is held to, measured on one mode's tokens. Exported for checking supplied tokens. */
export function checkTokens(mode: Mode, t: ModeTokens, missing?: Set<string>): ContrastCheck[] {
  const pairs: Array<[string, string, number]> = [];
  const text = (fg: string, ...bgs: string[]) => bgs.forEach((bg) => pairs.push([fg, bg, AA_TEXT]));
  const mark = (fg: string, ...bgs: string[]) => bgs.forEach((bg) => pairs.push([fg, bg, AA_NON_TEXT]));
  const surfaces = ["ds-surface", "ds-surface-raised", "ds-surface-overlay", "ds-surface-sunken"];

  text("ds-text", ...surfaces, "ds-background-neutral", "ds-background-neutral-hovered", "ds-background-neutral-pressed");
  text("ds-text", "ds-background-selected", "ds-background-selected-hovered", "ds-background-selected-pressed");
  text("ds-text-subtle", "ds-surface", "ds-surface-raised");
  text("ds-text-subtlest", "ds-surface", "ds-surface-raised");
  text("ds-text-inverse", "ds-background-neutral-bold");
  text("ds-text-on-brand", "ds-background-brand-bold", "ds-background-brand-bold-hovered", "ds-background-brand-bold-pressed");
  text("ds-text-brand", "ds-surface", "ds-surface-raised", "ds-surface-sunken", "ds-background-selected-pressed");
  text("ds-link", "ds-surface", "ds-surface-raised");
  mark("ds-border-focused", "ds-surface", "ds-surface-raised");
  for (const role of ["secondary", "tertiary"]) {
    text(`ds-text-on-${role}`, `ds-background-${role}-bold`, `ds-background-${role}-bold-hovered`, `ds-background-${role}-bold-pressed`);
    text(`ds-text-${role}`, "ds-surface", `ds-background-${role}`, `ds-background-${role}-pressed`);
  }
  for (const n of ["success", "warning", "danger", "information"]) {
    text(`ds-text-${n}`, "ds-surface", "ds-surface-raised", `ds-background-${n}`);
    text(`ds-text-on-${n}`, `ds-background-${n}-bold`, `ds-background-${n}-bold-hovered`);
    mark(`ds-icon-${n}`, "ds-surface");
  }
  text("ds-text-on-bold", "ds-background-success-bold", "ds-background-information-bold");

  // Supplied tokens (checkThemeCss) may lack one: that pair is skipped and the name reported in `missing`.
  return pairs.flatMap(([fg, bg, required]) => {
    const a = t[fg];
    const b = t[bg];
    if (!a || !b) {
      if (!a) missing?.add(fg);
      if (!b) missing?.add(bg);
      return [];
    }
    const ratio = contrast(a, b);
    return [{ mode, foreground: fg, background: bg, ratio, required, pass: ratio >= required }];
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
  if (input.controlShape === "rounded" || input.controlShape === "pill") clean.controlShape = input.controlShape;
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
    controlShape: input.controlShape ?? DEFAULT_LAYOUT.controlShape,
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
    checks: [...checkTokens("light", light), ...checkTokens("dark", dark)],
  };
}
