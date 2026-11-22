"use client";

import * as React from "react";
import { useLocale } from "react-aria-components";

import { copiedLabel, copyFailedLabel, copyLabel } from "../i18n";
import type { ComponentRadius } from "../defaults";
import { Button } from "./button";
import type { ButtonSize, ButtonVariant } from "./styles";

export type CopyButtonProps = {
  /** The text to copy, or a function that returns it (or a promise of it) at the moment of the press. */
  value: string | (() => string | Promise<string>);
  /** Shown as the label; left out, the button is icon-only and named by `aria-label` (default "Copy"). */
  children?: React.ReactNode;
  /** The name of an icon-only button: "Copy the invoice number". Default "Copy". */
  "aria-label"?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  radius?: ComponentRadius;
  /** Runs after a successful copy (to show a toast, log, …). */
  onCopy?: (text: string) => void;
};

/**
 * Copies text to the clipboard: the icon turns into a check for two seconds and a polite status says "Copied"
 * (or that it could not copy: no permission, an insecure page). Pressing again says it again.
 */
export function CopyButton({ value, children, "aria-label": ariaLabel, variant = "subtle", size = "small", radius, onCopy }: CopyButtonProps) {
  const { locale } = useLocale();
  // Each press gets its own result, so pressing again re-announces even when the words are the same.
  const [result, setResult] = React.useState<{ ok: boolean; press: number } | null>(null);
  React.useEffect(() => {
    if (!result) return;
    const timer = window.setTimeout(() => setResult(null), 2000);
    return () => window.clearTimeout(timer);
  }, [result]);
  const icon = result ? (result.ok ? "check" : "x") : "copy";
  const copy = async () => {
    const press = (result?.press ?? 0) + 1;
    try {
      const text = typeof value === "function" ? await value() : value;
      await navigator.clipboard.writeText(text);
      setResult({ ok: true, press });
      onCopy?.(text);
    } catch {
      // No permission, an insecure context or no clipboard API at all: say so.
      setResult({ ok: false, press });
    }
  };
  const message = result ? (result.ok ? copiedLabel(locale) : copyFailedLabel(locale)) : "";
  return (
    <>
      {children ? (
        <Button variant={variant} size={size} radius={radius} iconBefore={icon} data-slot="copy-button" data-result={result ? (result.ok ? "copied" : "failed") : undefined} onPress={() => void copy()}>
          {children}
        </Button>
      ) : (
        <Button
          variant={variant}
          size={size}
          radius={radius}
          iconOnly
          iconBefore={icon}
          aria-label={ariaLabel ?? copyLabel(locale)}
          data-slot="copy-button"
          data-result={result ? (result.ok ? "copied" : "failed") : undefined}
          onPress={() => void copy()}
        />
      )}
      <span role="status" data-slot="copy-button-status" className="sr-only">
        {message}
        {/* An invisible change per press makes screen readers read the same words again. */}
        {result && result.press % 2 === 0 ? "​" : ""}
      </span>
    </>
  );
}
