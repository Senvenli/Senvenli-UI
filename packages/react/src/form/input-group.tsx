"use client";

import * as React from "react";
import { Button as AriaButton, Group, type ButtonProps as AriaButtonProps } from "react-aria-components";
import { IconGlyph, type IconName } from "../display/icon";

import { cn } from "../utils";
import { radiusClass, useRadius, useFieldSize } from "../defaults";
import { ADDON, ADDON_END, ADDON_END_FLUSH, ADDON_START, FIELD_FRAME, FIELD_SIZE, INLINE_ACTION, INPUT, type FieldSize } from "./styles";

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
  /**
   * The control's id, description link and invalid state. A `Field` around the group sets them; the group hands
   * them to its `InputGroupInput`, so the label and the error reach the input, not the frame.
   */
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false";
};

type ControlLink = { id?: string; describedBy?: string; invalid: boolean; disabled?: boolean };
const InputGroupContext = React.createContext<ControlLink | null>(null);

/**
 * The field frame: one border around the control and its addons, icons and
 * inline actions. A press anywhere on the frame that is not an action
 * focuses the control, so addons never swallow focus.
 */
export function InputGroup({
  children, size: fieldSize, isDisabled, isInvalid: isInvalidProp, multiline, dir, id, "aria-describedby": describedBy, "aria-invalid": ariaInvalid,
}: InputGroupProps) {
  const size = useFieldSize(fieldSize);
  const frameRadius = useRadius(undefined);
  const ref = React.useRef<HTMLDivElement>(null);
  const isInvalid = isInvalidProp ?? (ariaInvalid === true || ariaInvalid === "true");
  const link = React.useMemo<ControlLink>(() => ({ id, describedBy, invalid: isInvalid, disabled: isDisabled }), [id, describedBy, isInvalid, isDisabled]);
  return (
    <InputGroupContext.Provider value={link}>
    <Group
      ref={ref}
      isDisabled={isDisabled}
      isInvalid={isInvalid}
      dir={dir}
      data-slot="input-group"
      data-size={size}
      className={cn(FIELD_FRAME, FIELD_SIZE[size], multiline ? "items-start py-ds-100" : "", radiusClass(frameRadius))}
      onMouseDown={(event) => {
        const target = event.target as HTMLElement;
        if (target.closest("input, textarea, select, button, a, label, [role='button'], [role='spinbutton'], [contenteditable], [data-slot='input-action']")) return;
        event.preventDefault();
        focusControl(ref.current, target);
      }}
    >
      {children}
    </Group>
    </InputGroupContext.Provider>
  );
}

export type InputGroupInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "className" | "style" | "size"> & {
  ref?: React.Ref<HTMLInputElement>;
};

/**
 * The bare input inside an `InputGroup`, styled as the frame's control. It takes the group's id, description link
 * and invalid state (from a `Field` around the group), so the label and the error belong to it. Its own props win.
 */
export function InputGroupInput({ ref, id, "aria-describedby": describedBy, "aria-invalid": ariaInvalid, disabled, ...rest }: InputGroupInputProps) {
  const link = React.useContext(InputGroupContext);
  return (
    <input
      ref={ref}
      data-slot="input-group-input"
      id={id ?? link?.id}
      aria-describedby={describedBy ?? link?.describedBy}
      aria-invalid={ariaInvalid ?? (link?.invalid || undefined)}
      disabled={disabled ?? link?.disabled}
      className={INPUT}
      {...rest}
    />
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
