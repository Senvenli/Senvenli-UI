"use client";

import * as React from "react";

/**
 * How the fields in a FormGroup or FormSection lay out: `vertical` (label over the control, the default) or
 * `horizontal` (label and description on the start side, the control on the end side, as a settings row).
 */
export type FieldOrientation = "vertical" | "horizontal";

export const FieldOrientationContext = React.createContext<FieldOrientation>("vertical");

/** The orientation a field sits in; Switch and Checkbox move their control to the row's end when horizontal. */
export function useFieldOrientation(): FieldOrientation {
  return React.useContext(FieldOrientationContext);
}

/** A Switch or Checkbox with its control at the end of the row: the text first, the control at the far end. */
export const CONTROL_AT_END = "flex w-full flex-row-reverse justify-between gap-ds-300";
