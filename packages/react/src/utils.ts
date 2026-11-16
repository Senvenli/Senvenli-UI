import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * The control-height utilities are project `@utility` rules, so stock
 * tailwind-merge does not know they set a height: without this, a consumer's
 * `h-auto` on a Button would sit beside `h-control` and the cascade, not the
 * caller, would decide which wins.
 */
const CONTROL_HEIGHT_CLASS_GROUPS = {
  h: ["control", "control-sm", "control-lg"],
  "min-h": ["control"],
  size: ["control", "control-sm", "control-lg"],
} as const;

/**
 * The type styles (`text-body-strong`, `text-heading-small`, …) are theme font
 * sizes, but stock tailwind-merge reads an unknown `text-*` as a color, so
 * `cn("text-ds-link", "text-body-strong")` would drop the color.
 */
export const TEXT_STYLES = [
  "display-large", "display-medium",
  "heading-xxlarge", "heading-xlarge", "heading-large", "heading-medium", "heading-small", "heading-xsmall", "heading-xxsmall",
  "body-large", "body", "body-strong", "body-small",
  "metric-large", "metric-medium", "metric-small",
  "code",
] as const;

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: [...TEXT_STYLES] }],
      h: [{ h: [...CONTROL_HEIGHT_CLASS_GROUPS.h] }],
      "min-h": [{ "min-h": [...CONTROL_HEIGHT_CLASS_GROUPS["min-h"]] }],
      size: [{ size: [...CONTROL_HEIGHT_CLASS_GROUPS.size] }],
    },
  },
});

/** Merge class names: clsx for conditions, tailwind-merge to resolve conflicting utilities. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
