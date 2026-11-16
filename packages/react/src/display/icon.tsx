"use client";

import * as React from "react";
import { icons, type LucideIcon } from "lucide-react";

import { cn } from "../utils";
import { ICON_ALIASES } from "./icon-aliases";
import type { IconColor, IconName, IconSize } from "./icon-names";

export type { IconColor, IconName, IconSize } from "./icon-names";

/**
 * Every Lucide icon ships with the package (owner decision 2026-10-08,
 *): no loading state, no flicker, also on the server. They live
 * in this one module, so an app's bundler keeps a single shared copy however
 * many DS components and screens draw icons. Only Lucide's `icons` set
 * ships, plus a small generated table for its alias names (icon-aliases.ts),
 * which keeps the rest of the lucide-react namespace out of the bundle.
 * Measured with esbuild for lucide-react 1.34.0 (1,777 icons + 254 aliases):
 * this module is 633.6 KiB minified, 156.9 KiB gzip, 126.0 KiB brotli; the
 * icons alone are 144.8 KiB gzip / 115.8 KiB brotli. The lucide-react peer
 * range is ^1.34.0: the name table follows Lucide 1.x.
 */
const REGISTRY = icons as unknown as Record<string, LucideIcon>;
const warned = new Set<string>();

/** "trash-2" → "Trash2", "arrow-up-right" → "ArrowUpRight" (Lucide's own naming). */
function componentName(name: string) {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

/** The Lucide component for a name, or undefined for a name Lucide does not have. */
export function resolveIcon(name: IconName): LucideIcon | undefined {
  // Own names first ("trash-2" → Trash2), then Lucide's older alias names ("alarm-check" → AlarmClockCheck).
  const key = Object.hasOwn(ICON_ALIASES, name) ? ICON_ALIASES[name] : componentName(name);
  return Object.hasOwn(REGISTRY, key) ? REGISTRY[key] : undefined;
}

const SIZE: Record<IconSize, string> = {
  small: "size-ds-icon-small",
  default: "size-ds-icon",
  large: "size-ds-icon-large",
};

const COLOR: Record<IconColor, string> = {
  inherit: "",
  default: "text-ds-icon",
  subtle: "text-ds-icon-subtle",
  brand: "text-ds-icon-brand",
  danger: "text-ds-icon-danger",
  warning: "text-ds-icon-warning",
  success: "text-ds-icon-success",
  information: "text-ds-icon-information",
};

export type IconProps = {
  /** Any Lucide name, kebab-case ("car", "key-round", "calendar-range"). */
  name: IconName;
  /** `small` 12px, `default` 16px, `large` 20px (`ds-size-icon-*`). */
  size?: IconSize;
  /** `inherit` (default) takes the text colour around it; the others are the `ds-icon-*` tokens. */
  color?: IconColor;
  /**
   * The accessible name for an icon that carries meaning on its own. Without
   * it the icon is decorative and hidden from assistive technology, which is
   * right when text next to it already says the same thing.
   */
  label?: string;
  /**
   * Mirrors the icon on an RTL page. Left out, the names in `DIRECTIONAL_ICONS` (arrows and
   * chevrons that point along the reading direction, undo/redo, send, sign in/out) mirror and every other
   * icon stays as drawn. `true` mirrors any icon; `false` keeps a directional one as drawn (a compass arrow,
   * a "swipe left" hint).
   */
  isDirectional?: boolean;
};

/**
 * Icons that point along the reading direction: on an RTL page "back" points right and
 * "next" left, so they mirror. Clocks, check marks, brand marks and everything symmetric keep their drawing.
 */
export const DIRECTIONAL_ICONS: ReadonlySet<string> = new Set([
  "arrow-left", "arrow-right", "arrow-up-left", "arrow-up-right", "arrow-down-left", "arrow-down-right",
  "arrow-left-to-line", "arrow-right-to-line", "arrow-big-left", "arrow-big-right",
  "chevron-left", "chevron-right", "chevrons-left", "chevrons-right", "chevron-first", "chevron-last",
  "circle-arrow-left", "circle-arrow-right", "move-left", "move-right",
  "undo", "undo-2", "redo", "redo-2", "reply", "reply-all", "forward",
  "send", "send-horizontal", "log-in", "log-out", "external-link", "square-arrow-out-up-right",
]);

/**
 * Mirrors on an RTL page. Tailwind's `rtl:` also matches inside an LTR island on that page (a calendar laid out in
 * an LTR locale), so `:dir(ltr)` turns it back there.
 */
export const MIRROR_IN_RTL = "rtl:-scale-x-100 [&:dir(ltr)]:scale-x-100";

/** The DS-internal form: also takes classes and a stroke (12px marks use 3). Not exported from the package. */
export function IconGlyph({
  name, size = "default", color = "inherit", label, isDirectional, className, strokeWidth = 2, ...data
}: IconProps & { className?: string; strokeWidth?: number; "data-slot"?: string }) {
  const Component = resolveIcon(name);
  const a11y = label ? { role: "img" as const, "aria-label": label } : { "aria-hidden": true as const };
  const mirrored = isDirectional ?? DIRECTIONAL_ICONS.has(name);
  const classes = cn("shrink-0", SIZE[size], COLOR[color], mirrored && MIRROR_IN_RTL, className);
  const slot = data["data-slot"] ?? "icon";
  if (!Component) {
    // A name Lucide does not have (a typo past the types, or a name newer than the shipped table):
    // keep the box so the layout holds, and say so once.
    if (!warned.has(name)) {
      warned.add(name);
      console.warn(`[@senvenli/react] Icon "${name}" is not in the shipped Lucide set.`);
    }
    return <span {...a11y} data-slot={slot} data-icon={name} data-missing="" className={cn("inline-block", classes)} />;
  }
  return <Component {...a11y} data-slot={slot} data-icon={name} strokeWidth={strokeWidth} className={classes} />;
}

/**
 * A Lucide icon by name. Apps never import `lucide-react` themselves; size,
 * colour and the accessible label live here.
 */
export function Icon(props: IconProps) {
  return <IconGlyph {...props} />;
}

/** Marks `<Icon>` elements, so fields can tell an icon from a text addon (`prefix={<Icon name="search" />}`). */
export const ICON_ELEMENT = Symbol.for("senvenli.ds.icon");
(Icon as unknown as Record<symbol, boolean>)[ICON_ELEMENT] = true;

export function isIconElement(node: React.ReactNode): node is React.ReactElement<IconProps> {
  return React.isValidElement(node) && typeof node.type === "function" && (node.type as unknown as Record<symbol, unknown>)[ICON_ELEMENT] === true;
}
