"use client";

import * as React from "react";
import { Switch as AriaSwitch } from "react-aria-components";

import { useChoiceText } from "./choice-text";
import { CHOICE_ROW, SWITCH_THUMB, SWITCH_TRACK } from "./styles";
import { cn } from "../utils";
import { CHOICE_ROW_SIZE, SWITCH_THUMB_SIZE, SWITCH_TRACK_SIZE, useChoiceSize, type ChoiceSize } from "./choice-size";

export type SwitchProps = {
  /** `small`, `medium` (default) or `large`; the provider default otherwise. */
  size?: ChoiceSize;
  /** The setting, named as its on-state ("Online orders"), never "On/Off". */
  children: React.ReactNode;
  isSelected?: boolean;
  defaultSelected?: boolean;
  onChange?: (isSelected: boolean) => void;
  description?: React.ReactNode;
  isDisabled?: boolean;
  name?: string;
  /**
   * Marks a pending change ("saving"): `aria-busy` on the switch control itself, the `role="switch"` input,
   * where screen readers read it. It does not lock the switch: it still toggles unless `isDisabled` is set
   * too. Left out, the DOM is unchanged. It is applied after hydration (in a layout effect, as
   * React Aria does not forward it), so server-rendered HTML does not carry it; it appears on the first client
   * render.
   */
  "aria-busy"?: boolean | "true" | "false";
};

/** A setting that applies at once, with no save step (inside a submit form, use Checkbox). */
export const Switch = React.forwardRef<HTMLLabelElement, SwitchProps>(function Switch({ children, description, "aria-busy": busy, size: ownSize, ...rest }, ref) {
  const size = useChoiceSize(ownSize);
  const text = useChoiceText(description, undefined);
  const inputRef = React.useRef<HTMLInputElement>(null);
  // React Aria's Switch passes no aria-busy to its input (useToggle forwards only labelling props), so it is set
  // on the input here, as React would render it. Left out, there is no attribute (removing none changes nothing).
  React.useLayoutEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    if (busy == null) input.removeAttribute("aria-busy");
    else input.setAttribute("aria-busy", String(busy));
  }, [busy]);
  return (
    <AriaSwitch {...rest} ref={ref} inputRef={inputRef} aria-labelledby={text.labelId} aria-describedby={text.describedBy} data-slot="switch" className={cn(CHOICE_ROW, CHOICE_ROW_SIZE[size])}>
      <span aria-hidden="true" data-slot="switch-track" className={cn(SWITCH_TRACK, SWITCH_TRACK_SIZE[size])}>
        <span data-slot="switch-thumb" className={cn(SWITCH_THUMB, SWITCH_THUMB_SIZE[size])} />
      </span>
      {text.render(children)}
    </AriaSwitch>
  );
});
