"use client";

import * as React from "react";
import { Button as AriaButton, Group, type ButtonProps as AriaButtonProps } from "react-aria-components";
import { IconGlyph, type IconName } from "../display/icon";

import { cn } from "../utils";
import { ADDON, ADDON_END, ADDON_END_FLUSH, ADDON_START, FIELD_FRAME, FIELD_SIZE, INLINE_ACTION, type FieldSize } from "./styles";

/**
 * Focuses the field's own control wherever inside the frame the press landed: its input or textarea, or a
 * date/time field's first editable segment (date fields also hold a hidden input for forms, never focused).
 */
function focusControl(frame: HTMLElement | null, pressed?: HTMLElement | null) {
  // A field in parts (a date range's start and end) focuses the part that was pressed, not the first one.
  const scope = pressed?.closest<HTMLElement>("[data-field-part]") ?? frame;
  const control = scope?.querySelector<HTMLElement>("input:not([type='hidden']), textarea, [role='spinbutton'][tabindex]");
  if (control && document.activeElement !== control) control.focus();
}

export type InputGroupProps = {
  children: React.ReactNode;
  size?: FieldSize;
  isDisabled?: boolean;
  isInvalid?: boolean;
  /** Multi-line content (TextArea): items align to the top. */
  multiline?: boolean;
  /** `ltr` keeps the frame left to right on an RTL page (phone numbers, IBANs). */
  dir?: "ltr";
};

/**
 * The field frame: one border around the control and its addons, icons and
 * inline actions. A press anywhere on the frame that is not an action
 * focuses the control, so addons never swallow focus.
 */
export function InputGroup({ children, size = "default", isDisabled, isInvalid, multiline, dir }: InputGroupProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  return (
    <Group
      ref={ref}
      isDisabled={isDisabled}
      isInvalid={isInvalid}
      dir={dir}
      data-slot="input-group"
      data-size={size}
      className={cn(FIELD_FRAME, FIELD_SIZE[size], multiline ? "items-start py-ds-100" : "")}
      onMouseDown={(event) => {
        const target = event.target as HTMLElement;
        if (target.closest("input, textarea, select, button, a, label, [role='button'], [role='spinbutton'], [contenteditable], [data-slot='input-action']")) return;
        event.preventDefault();
        focusControl(ref.current, target);
      }}
    >
      {children}
    </Group>
  );
}

export type InputAddonProps = {
  children: React.ReactNode;
  /** Which side of the value it sits on. */
  position?: "start" | "end";
  /** Flush with the frame edge (default). Off when another part, such as a stepper, follows an end addon. */
  flush?: boolean;
  /** Extra handler; focus forwarding to the control always runs as well. */
  onClick?: React.MouseEventHandler<HTMLSpanElement>;
};

/**
 * Fixed text inside the frame: a unit, currency or URL part ("km", "€",
 * "https://"). It sits on `ds-surface-sunken`, flush with the frame edge, behind
 * a `ds-border` divider.
 */
export function InputAddon({ children, onClick, position = "start", flush = true }: InputAddonProps) {
  return (
    <span
      data-slot="input-addon"
      data-position={position}
      className={cn(ADDON, position === "start" ? ADDON_START : cn(ADDON_END, flush && ADDON_END_FLUSH))}
      onClick={(event) => {
        onClick?.(event);
        focusControl((event.currentTarget as HTMLElement).closest("[data-slot='input-group']"));
      }}
    >
      {children}
    </span>
  );
}

export type InputActionProps = Omit<AriaButtonProps, "className" | "style" | "children"> & {
  /** Lucide icon name ("copy", "circle-x"). */
  icon: IconName;
  /** Names the action ("Kopyala", "Temizle"). */
  "aria-label": string;
};

/** A 24px icon button inside the frame (copy, clear, reveal). */
export const InputAction = React.forwardRef<HTMLButtonElement, InputActionProps>(function InputAction(
  { icon, ...rest },
  ref,
) {
  return (
    <AriaButton {...rest} ref={ref} type="button" data-slot="input-action" className={INLINE_ACTION}>
      <IconGlyph name={icon} data-slot="input-action-icon" />
    </AriaButton>
  );
});
