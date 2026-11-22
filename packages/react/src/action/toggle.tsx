"use client";

import * as React from "react";
import {
  ToggleButton as AriaToggleButton,
  ToggleButtonGroup as AriaToggleButtonGroup,
  type Key,
  type ToggleButtonGroupProps as AriaToggleButtonGroupProps,
  type ToggleButtonProps as AriaToggleButtonProps,
} from "react-aria-components";
import { IconGlyph, type IconName } from "../display/icon";

import { cn } from "../utils";
import { radiusClass, useComponentDefaults, type ComponentRadius } from "../defaults";
import { ICON, TOGGLE, TOGGLE_SIZE, type ToggleSize } from "./styles";

export type ToggleButtonProps = Omit<AriaToggleButtonProps, "className" | "style" | "children"> & {
  /** The label never changes with the state; `aria-pressed` carries it. */
  children: React.ReactNode;
  /** Lucide icon name before the label. */
  icon?: IconName;
  size?: ToggleSize;
  /** Corner radius; the provider's default otherwise. */
  radius?: ComponentRadius;
};

/** A button that stays pressed: `ds-background-selected` with the selected border while on. */
export const ToggleButton = React.forwardRef<HTMLButtonElement, ToggleButtonProps>(function ToggleButton(
  { children, icon, size: sizeProp, radius: radiusProp, ...rest },
  ref,
) {
  const defaults = useComponentDefaults();
  const size: ToggleSize = sizeProp ?? (defaults.size === "small" ? "small" : "medium");
  const radius = radiusProp ?? defaults.radius;
  return (
    <AriaToggleButton {...rest} ref={ref} data-slot="toggle-button" className={cn(TOGGLE, TOGGLE_SIZE[size], radiusClass(radius))}>
      {icon && <IconGlyph name={icon} data-slot="toggle-button-icon" className={ICON} />}
      {children}
    </AriaToggleButton>
  );
});

export type ToggleGroupProps = Omit<AriaToggleButtonGroupProps, "className" | "style" | "children" | "aria-label"> & {
  /** Names the group ("Text alignment"). */
  label: string;
  children: React.ReactNode;
};

/**
 * Independent filters that combine (`selectionMode="multiple"`, the default
 * here) or one choice (`single`). Multiple renders a `toolbar` of buttons with
 * `aria-pressed`; single renders a `radiogroup` whose buttons carry
 * `role="radio"` and `aria-checked` (React Aria), which is the correct state
 * for a one-of choice. Arrow keys move between the buttons; Tab
 * enters and leaves the group once. For mutually exclusive views on one
 * object, use the segmented control (Tabs card) instead.
 */
export const ToggleGroup = React.forwardRef<HTMLDivElement, ToggleGroupProps>(function ToggleGroup(
  { label, children, selectionMode = "multiple", ...rest },
  ref,
) {
  return (
    <AriaToggleButtonGroup
      {...rest}
      ref={ref}
      aria-label={label}
      selectionMode={selectionMode}
      data-slot="toggle-group"
      className="inline-flex flex-wrap items-center gap-ds-100"
    >
      {children}
    </AriaToggleButtonGroup>
  );
});

export type { Key };
