import * as React from "react";

import { useComponentDefaults, type ComponentSize } from "../defaults";

/**
 * Sizes of the choice controls (Checkbox, Radio, Switch) and Slider. `medium` is the design every class in
 * `styles.ts` draws; `small` and `large` add only the classes that differ, after the base, so `cn` lets them win.
 */
export type ChoiceSize = ComponentSize;

/** A group's size, for the Checkboxes or Radios inside it. */
export const ChoiceSizeContext = React.createContext<ChoiceSize | undefined>(undefined);

/** The control's size: its own, else its group's, else the provider default, else medium. */
export function useChoiceSize(own: ChoiceSize | undefined): ChoiceSize {
  const group = React.useContext(ChoiceSizeContext);
  const defaults = useComponentDefaults();
  return own ?? group ?? defaults.size ?? "medium";
}

/** The row: label size and the gap to the indicator. */
export const CHOICE_ROW_SIZE: Record<ChoiceSize, string> = {
  small: "gap-ds-075 text-body-small",
  medium: "",
  large: "gap-ds-150 text-body-large",
};

/** Checkbox box and Radio dot: 14, 16 or 20px. */
export const INDICATOR_SIZE: Record<ChoiceSize, string> = {
  small: "size-3.5",
  medium: "",
  large: "size-5",
};

/** The check or minus inside a Checkbox. */
export const CHECK_ICON_SIZE: Record<ChoiceSize, string> = {
  small: "size-2.5",
  medium: "",
  large: "size-3.5",
};

/** A selected Radio's ring: 4, 5 or 6px. */
export const RADIO_RING_SIZE: Record<ChoiceSize, string> = {
  small: "group-data-[selected]:border-[4px]",
  medium: "",
  large: "group-data-[selected]:border-[6px]",
};

/** Switch track 26×16, 32×20 or 40×24; the thumb travels the track minus itself and its 2px insets. */
export const SWITCH_TRACK_SIZE: Record<ChoiceSize, string> = {
  small: "h-4 w-[26px]",
  medium: "",
  large: "h-6 w-10",
};
export const SWITCH_THUMB_SIZE: Record<ChoiceSize, string> = {
  small: "size-3 group-data-[selected]:translate-x-2.5 rtl:group-data-[selected]:-translate-x-2.5",
  medium: "",
  large: "size-5 group-data-[selected]:translate-x-4 rtl:group-data-[selected]:-translate-x-4",
};

/** Slider: track height, rail and fill thickness, thumb. */
export const SLIDER_TRACK_SIZE: Record<ChoiceSize, string> = { small: "h-4", medium: "", large: "h-6" };
export const SLIDER_BAR_SIZE: Record<ChoiceSize, string> = { small: "h-0.5", medium: "", large: "h-1.5" };
export const SLIDER_THUMB_SIZE: Record<ChoiceSize, string> = { small: "size-4", medium: "", large: "size-6" };
