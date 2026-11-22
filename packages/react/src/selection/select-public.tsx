"use client";

import * as React from "react";

import { MultiSelect, type MultiSelectProps } from "./multi-select";
import { Select as SingleSelect, type SelectProps as SingleSelectProps } from "./select";

export type SelectSingleProps = SingleSelectProps & {
  /** `single` (default): one choice from a known list. */
  selectionMode?: "single";
};
export type SelectMultipleProps = MultiSelectProps & {
  /** `multiple`: several choices, shown as removable tags, with an optional select-all. */
  selectionMode: "multiple";
};
export type SelectProps = SelectSingleProps | SelectMultipleProps;

/**
 * A choice from a known list in a dropdown: one (`selectionMode="single"`, the default) or several
 * (`selectionMode="multiple"`, shown as tags), as HeroUI and Ant Design model it. For a long list to search, use
 * ComboBox, which takes the same `selectionMode`.
 */
export const Select = React.forwardRef<HTMLButtonElement, SelectProps>(function Select(props, ref) {
  if (props.selectionMode === "multiple") {
    const { selectionMode: _mode, ...rest } = props;
    return <MultiSelect {...rest} />;
  }
  const { selectionMode: _mode, ...rest } = props;
  return <SingleSelect {...rest} ref={ref} />;
});
