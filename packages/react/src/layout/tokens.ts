/**
 * Token-to-class maps for the layout primitives.
 *
 * Every value a layout prop accepts is a design-system token name, and every
 * class here is written out in full so Tailwind finds it when it scans the
 * package (`@source "…/@senvenli/react/dist"`). The utilities come from
 * `@senvenli/react/theme.css` and the generated theme.
 */

export const SPACE_TOKENS = [
  "space-0", "space-025", "space-050", "space-075", "space-100", "space-150", "space-200",
  "space-250", "space-300", "space-400", "space-500", "space-600", "space-800", "space-1000",
] as const;
export type Space = (typeof SPACE_TOKENS)[number];

export const GAP: Record<Space, string> = {
  "space-0": "gap-ds-0", "space-025": "gap-ds-025", "space-050": "gap-ds-050", "space-075": "gap-ds-075",
  "space-100": "gap-ds-100", "space-150": "gap-ds-150", "space-200": "gap-ds-200", "space-250": "gap-ds-250",
  "space-300": "gap-ds-300", "space-400": "gap-ds-400", "space-500": "gap-ds-500", "space-600": "gap-ds-600",
  "space-800": "gap-ds-800", "space-1000": "gap-ds-1000",
};

export const PADDING: Record<Space, string> = {
  "space-0": "p-ds-0", "space-025": "p-ds-025", "space-050": "p-ds-050", "space-075": "p-ds-075",
  "space-100": "p-ds-100", "space-150": "p-ds-150", "space-200": "p-ds-200", "space-250": "p-ds-250",
  "space-300": "p-ds-300", "space-400": "p-ds-400", "space-500": "p-ds-500", "space-600": "p-ds-600",
  "space-800": "p-ds-800", "space-1000": "p-ds-1000",
};

/** Inline-axis padding: `padding-inline`, so it is the same in RTL. */
export const PADDING_INLINE: Record<Space, string> = {
  "space-0": "px-ds-0", "space-025": "px-ds-025", "space-050": "px-ds-050", "space-075": "px-ds-075",
  "space-100": "px-ds-100", "space-150": "px-ds-150", "space-200": "px-ds-200", "space-250": "px-ds-250",
  "space-300": "px-ds-300", "space-400": "px-ds-400", "space-500": "px-ds-500", "space-600": "px-ds-600",
  "space-800": "px-ds-800", "space-1000": "px-ds-1000",
};

export const PADDING_BLOCK: Record<Space, string> = {
  "space-0": "py-ds-0", "space-025": "py-ds-025", "space-050": "py-ds-050", "space-075": "py-ds-075",
  "space-100": "py-ds-100", "space-150": "py-ds-150", "space-200": "py-ds-200", "space-250": "py-ds-250",
  "space-300": "py-ds-300", "space-400": "py-ds-400", "space-500": "py-ds-500", "space-600": "py-ds-600",
  "space-800": "py-ds-800", "space-1000": "py-ds-1000",
};

export type Background =
  | "surface" | "surface-raised" | "surface-sunken" | "surface-overlay"
  | "neutral" | "selected" | "brand-subtle"
  | "information" | "success" | "warning" | "danger";

export const BACKGROUND: Record<Background, string> = {
  surface: "bg-ds-surface",
  "surface-raised": "bg-ds-surface-raised",
  "surface-sunken": "bg-ds-surface-sunken",
  "surface-overlay": "bg-ds-surface-overlay",
  neutral: "bg-ds-background-neutral",
  selected: "bg-ds-background-selected",
  "brand-subtle": "bg-ds-background-brand-subtle",
  information: "bg-ds-background-information",
  success: "bg-ds-background-success",
  warning: "bg-ds-background-warning",
  danger: "bg-ds-background-danger",
};

/** The same scale as every component's `radius` (none, small, medium, large, full). */
export type Radius = "none" | "small" | "medium" | "large" | "full";
export const RADIUS: Record<Radius, string> = {
  none: "rounded-none",
  small: "rounded-ds-small",
  medium: "rounded-ds-medium",
  large: "rounded-ds-large",
  full: "rounded-ds-full",
};

export type Shadow = "raised" | "overflow" | "overlay";
export const SHADOW: Record<Shadow, string> = {
  raised: "shadow-ds-raised",
  overflow: "shadow-ds-overflow",
  overlay: "shadow-ds-overlay",
};

/** `true` divides (`ds-border`); `"bold"` is for edges the user must see to operate. */
export type Border = boolean | "bold";
export const BORDER = {
  default: "border border-ds-border",
  bold: "border border-ds-border-bold",
} as const;

export type Align = "start" | "center" | "end" | "stretch" | "baseline";
export const ALIGN_ITEMS: Record<Align, string> = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
  baseline: "items-baseline",
};

export type Justify = "start" | "center" | "end" | "between";
export const JUSTIFY: Record<Justify, string> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
};

export function borderClass(border: Border | undefined): string | undefined {
  if (!border) return undefined;
  return border === "bold" ? BORDER.bold : BORDER.default;
}
