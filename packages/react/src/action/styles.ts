/**
 * Class recipes for the action components, written out in full
 * so Tailwind finds them when it scans the package. Colours, sizes, radii and
 * motion come from Token v3 utilities (`@senvenli/react/theme.css` and the generated theme).
 * React Aria sets the `data-hovered` / `data-pressed` / `data-focus-visible`
 * / `data-disabled` / `data-pending` / `data-selected` attributes.
 */

/**
 * Keyboard focus (a design rule): no outer ring and no offset.
 * A 2px inner border (`inset-ring`, so size and elevation never change)
 * appears on keyboard focus only; pointer focus shows nothing. The colour
 * contrasts with the control's own fill by at least 3:1 (WCAG 2.4.13):
 * `ds-border-focused` on neutral and light grounds, the control's own text
 * colour on filled gold / danger buttons, where blue would fall to ~1.3:1.
 */
export const FOCUS_INSET = "outline-hidden data-[focus-visible]:inset-ring-2";
export const FOCUS_COLOR = "data-[focus-visible]:inset-ring-ds-border-focused";

export type ButtonVariant = "primary" | "default" | "subtle" | "link";
/** What the action means: `neutral` (default) or `danger` for a destructive one (delete, discard). */
export type ButtonTone = "neutral" | "danger";
export type ButtonSize = "small" | "medium" | "large";

export const BUTTON_BASE =
  "relative inline-flex shrink-0 items-center justify-center gap-ds-075 whitespace-nowrap rounded-ds-medium select-none cursor-pointer " +
  "transition-colors duration-(--ds-duration-instant) ease-ds-standard " +
  FOCUS_INSET +
  " data-[disabled]:cursor-not-allowed data-[pending]:cursor-wait";

export const BUTTON_VARIANT: Record<ButtonVariant | "danger" | "subtleDanger" | "linkDanger", string> = {
  primary:
    "data-[focus-visible]:inset-ring-ds-text-on-brand bg-ds-background-brand-bold text-ds-text-on-brand data-[hovered]:bg-ds-background-brand-bold-hovered data-[pressed]:bg-ds-background-brand-bold-pressed " +
    "data-[disabled]:bg-ds-background-disabled data-[disabled]:text-ds-text-disabled",
  default:
    "data-[focus-visible]:inset-ring-ds-border-focused bg-ds-background-neutral text-ds-text data-[hovered]:bg-ds-background-neutral-hovered data-[pressed]:bg-ds-background-neutral-pressed " +
    "data-[disabled]:bg-ds-background-disabled data-[disabled]:text-ds-text-disabled",
  subtle:
    "data-[focus-visible]:inset-ring-ds-border-focused bg-transparent text-ds-text data-[hovered]:bg-ds-background-neutral-subtle-hovered data-[pressed]:bg-ds-background-neutral-pressed " +
    "data-[disabled]:text-ds-text-disabled",
  // The theme has no danger-pressed step; pressed reuses the hovered fill.
  danger:
    "data-[focus-visible]:inset-ring-ds-text-on-danger bg-ds-background-danger-bold text-ds-text-on-danger data-[hovered]:bg-ds-background-danger-bold-hovered data-[pressed]:bg-ds-background-danger-bold-hovered " +
    "data-[disabled]:bg-ds-background-disabled data-[disabled]:text-ds-text-disabled",
  link:
    "data-[focus-visible]:inset-ring-ds-border-focused bg-transparent text-ds-link underline-offset-3 data-[hovered]:underline data-[pressed]:text-ds-link-pressed " +
    "data-[disabled]:text-ds-text-disabled data-[disabled]:no-underline",
  subtleDanger:
    "data-[focus-visible]:inset-ring-ds-border-focused bg-transparent text-ds-text-danger data-[hovered]:bg-ds-background-danger data-[pressed]:bg-ds-background-danger " +
    "data-[disabled]:text-ds-text-disabled",
  linkDanger:
    "data-[focus-visible]:inset-ring-ds-border-focused bg-transparent text-ds-text-danger underline-offset-3 data-[hovered]:underline " +
    "data-[disabled]:text-ds-text-disabled data-[disabled]:no-underline",
};

/**
 * The classes for a variant in a tone. `danger` keeps the shape of its variant: a red fill for `primary` and
 * `default`, red text for `subtle` and `link`.
 */
export function buttonVariantClasses(variant: ButtonVariant, tone: ButtonTone = "neutral"): string {
  if (tone !== "danger") return BUTTON_VARIANT[variant];
  if (variant === "subtle") return BUTTON_VARIANT.subtleDanger;
  if (variant === "link") return BUTTON_VARIANT.linkDanger;
  return BUTTON_VARIANT.danger;
}

/**
 * A 44px hit area under a coarse pointer, invisible, for
 * the compact size (32px) and the icon-only default (36px), below the 44 × 44 CSS px that WCAG 2.5.5 and Apple's
 * HIG ask a touch target for. Classes for an empty `aria-hidden` span the button renders (`TouchTarget`): under a
 * fine pointer it is `display: none`, so a mouse user's page is as before; under a coarse pointer it covers the
 * button (absolute, inset 0) and its transparent `::before` grows past it by (44px − the button's side) ÷ 2 on each
 * side shorter than 44px, and not at all on a side already as long (a compact text button grows only up and down).
 * Nothing is drawn, and nothing moves: the span is absolutely positioned (no flow, no baseline), and its layout
 * containment makes the growth ink overflow, so a button at a scroll container's edge adds nothing to its
 * scrollable overflow (no sideways scroll on a phone), while a tap there still lands on the button. Equal insets on
 * both inline sides keep it centred in RTL. Buttons joined in a ButtonGroup touch, so there it grows only up and
 * down (the two group rules never both apply): a side would only cover the neighbour. Trade-off: elsewhere, two
 * such buttons closer than the growth (12px apart for compact, 8px for icon-only default) share the gap, and the
 * later one in the document takes the overlap, up to 6px (4px) of the earlier one's edge when they touch; an
 * ancestor that clips (`overflow: hidden`) clips the hit area too.
 */
export const TOUCH_TARGET =
  "hidden pointer-coarse:block absolute inset-0 contain-layout before:absolute " +
  "before:inset-y-[min(0px,calc((100%_-_44px)/2))] " +
  "not-in-data-[slot=button-group]:before:inset-x-[min(0px,calc((100%_-_44px)/2))] " +
  "in-data-[slot=button-group]:before:inset-x-0";

/** Whether a Button-shaped control of this size gets the touch hit area: compact, or icon-only at the default size. */
export const hasTouchTarget = (size: ButtonSize, iconOnly: boolean | undefined) => size === "small" || (Boolean(iconOnly) && size === "medium");

/** Height, padding and type per size; `link` keeps text padding at every size. */
export const BUTTON_SIZE: Record<ButtonSize, string> = {
  small: "h-ds-control-compact px-ds-100 text-body-strong",
  medium: "h-ds-control px-ds-150 text-body-strong",
  // 16px at weight 500 is the design's large button; no named type style has that pair.
  large: "h-ds-control-large px-ds-200 text-body-large font-[500]",
};

export const LINK_BUTTON_PADDING = "px-ds-050";

export const ICON_ONLY_SIZE: Record<ButtonSize, string> = {
  small: "w-ds-control-compact px-0",
  medium: "w-ds-control px-0",
  large: "w-ds-control-large px-0",
};

export const ICON = "size-ds-icon shrink-0";

export type ToggleSize = "small" | "medium";

export const TOGGLE =
  "inline-flex shrink-0 items-center justify-center gap-ds-075 whitespace-nowrap rounded-ds-medium border border-ds-border-bold text-ds-text-subtle select-none cursor-pointer outline-hidden " +
  "transition-colors duration-(--ds-duration-instant) ease-ds-standard" +
  " data-[hovered]:bg-ds-background-neutral-subtle-hovered data-[pressed]:bg-ds-background-neutral-pressed" +
  " data-[selected]:bg-ds-background-selected data-[selected]:border-ds-border-selected data-[selected]:text-ds-text" +
  " data-[selected]:data-[hovered]:bg-ds-background-selected-hovered data-[selected]:data-[pressed]:bg-ds-background-selected-pressed" +
  " data-[focus-visible]:inset-ring-2 data-[focus-visible]:inset-ring-ds-border-focused" +
  " data-[disabled]:cursor-not-allowed data-[disabled]:border-ds-border data-[disabled]:text-ds-text-disabled";

export const TOGGLE_SIZE: Record<ToggleSize, string> = {
  small: "h-ds-control-compact px-ds-100 text-body-strong",
  medium: "h-ds-control px-ds-150 text-body-strong",
};

export type LinkVariant = "default" | "inline" | "subtle";

/** Links mark keyboard focus with a 2px `ds-border-focused` underline: a border around inline text would break the line. */
export const LINK_FOCUS =
  "outline-hidden data-[focus-visible]:underline data-[focus-visible]:decoration-2 data-[focus-visible]:decoration-ds-border-focused";

export const LINK_BASE =
  "underline-offset-3 decoration-1 cursor-pointer transition-[text-decoration-color] duration-(--ds-duration-instant) " +
  LINK_FOCUS +
  " data-[disabled]:cursor-not-allowed data-[disabled]:text-ds-text-disabled data-[disabled]:no-underline";

export const LINK_VARIANT: Record<LinkVariant, string> = {
  default: "text-ds-link no-underline data-[hovered]:underline data-[pressed]:text-ds-link-pressed",
  inline: "text-ds-link underline data-[pressed]:text-ds-link-pressed",
  subtle: "text-ds-text-subtle no-underline data-[hovered]:underline data-[hovered]:text-ds-text",
};
