/**
 * Field recipes. The frame is a React Aria `Group`, so it gets
 * `data-hovered`, `data-focus-within`, `data-invalid` and `data-disabled`.
 *
 * Focus (a design rule): no ring. The field's own 1px
 * `ds-border-bold` turns `ds-border-focused` and a 1px inner line joins it,
 * 2px in all. The inner line is an outline pulled inside the border
 * (`-outline-offset-2`), never outside: outlines paint above the addons'
 * fill, so the 2px edge stays whole next to them; invalid uses the same 2px in `ds-border-danger` and stays red
 * while the field is focused, so the error never disappears under the caret.
 */
export const FIELD_FRAME =
  "relative flex w-full items-center gap-ds-075 rounded-ds-medium border border-ds-border-bold bg-ds-background-input text-ds-text outline-hidden " +
  "transition-colors duration-(--ds-duration-instant) ease-ds-standard " +
  "data-[hovered]:bg-ds-background-input-hovered " +
  "data-[focus-within]:border-ds-border-focused data-[focus-within]:outline-1 data-[focus-within]:outline-solid data-[focus-within]:-outline-offset-2 data-[focus-within]:outline-ds-border-focused " +
  "data-[invalid]:border-ds-border-danger data-[invalid]:outline-1 data-[invalid]:outline-solid data-[invalid]:-outline-offset-2 data-[invalid]:outline-ds-border-danger " +
  "data-[invalid]:data-[focus-within]:border-ds-border-danger data-[invalid]:data-[focus-within]:outline-ds-border-danger " +
  "data-[disabled]:border-transparent data-[disabled]:bg-ds-background-disabled data-[disabled]:text-ds-text-disabled";

export type FieldSize = "small" | "medium" | "large";

/** `--field-pad` carries the inline padding so addons can sit flush with the edge. */
export const FIELD_SIZE: Record<FieldSize, string> = {
  medium: "min-h-ds-control [--field-pad:var(--ds-space-150)] px-(--field-pad)",
  small: "min-h-ds-control-compact [--field-pad:var(--ds-space-100)] px-(--field-pad)",
  large: "min-h-ds-control-large [--field-pad:var(--ds-space-200)] px-(--field-pad) text-body-large",
};

export const INPUT =
  "min-w-0 flex-1 self-stretch bg-transparent text-inherit outline-hidden placeholder:text-ds-text-subtlest disabled:cursor-not-allowed";

export const LABEL = "flex items-baseline gap-ds-050 text-body-small font-medium text-ds-text-subtle";
export const REQUIRED_MARK = "text-ds-text-danger";
export const OPTIONAL_MARK = "font-normal text-ds-text-subtlest";
export const DESCRIPTION = "text-body-small text-ds-text-subtlest";
export const ERROR = "flex items-center gap-ds-050 text-body-small text-ds-text-danger";
export const FIELD_STACK = "flex min-w-0 flex-col gap-ds-050";

export const ADDON =
  "flex shrink-0 items-center self-stretch bg-ds-surface-sunken px-ds-100 text-body text-ds-text-subtle tabular-nums select-none";
/** Flush with the frame's start edge, divided from the value by `ds-border`. */
export const ADDON_START = "-ms-(--field-pad) rounded-s-ds-medium border-e border-ds-border";
/** At the end; flush with the edge unless something (a stepper) follows it. */
export const ADDON_END = "border-s border-ds-border";
export const ADDON_END_FLUSH = "-me-(--field-pad) rounded-e-ds-medium";

export const INLINE_ACTION =
  "inline-flex size-6 shrink-0 items-center justify-center rounded-ds-small text-ds-icon-subtle cursor-pointer outline-hidden " +
  "data-[hovered]:bg-ds-background-neutral-subtle-hovered data-[pressed]:bg-ds-background-neutral-pressed " +
  "data-[focus-visible]:inset-ring-2 data-[focus-visible]:inset-ring-ds-border-focused";

export const FIELD_ICON = "size-ds-icon shrink-0 text-ds-icon-subtle";
