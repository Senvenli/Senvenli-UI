"use client";

import * as React from "react";
import { useLocale } from "react-aria-components";

import { Button, type ButtonProps } from "./button";
import { closeLabel } from "../i18n";

export { closeLabel } from "../i18n";

export type CloseButtonProps = Omit<ButtonProps, "variant" | "iconOnly" | "iconBefore" | "iconAfter" | "children" | "aria-label"> & {
  /** Overrides the localized "Close" name. */
  "aria-label"?: string;
};

/** The subtle icon button with an `x` that closes a dialog, drawer, banner or toast. */
export const CloseButton = React.forwardRef<HTMLButtonElement, CloseButtonProps>(function CloseButton(
  { size = "small", "aria-label": ariaLabel, ...rest },
  ref,
) {
  const { locale } = useLocale();
  return (
    <Button
      {...rest}
      ref={ref}
      variant="subtle"
      size={size}
      iconOnly
      iconBefore="x"
      aria-label={ariaLabel ?? closeLabel(locale)}
      // A part-specific slot from the parent (banner-dismiss) wins over the generic one.
      data-slot={(rest as { "data-slot"?: string })["data-slot"] ?? "close-button"}
    />
  );
});
