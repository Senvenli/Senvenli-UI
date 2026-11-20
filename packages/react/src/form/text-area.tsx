"use client";

import * as React from "react";
import {
  Label as AriaLabel,
  TextArea as AriaTextArea,
  TextField as AriaTextField,
  useLocale,
  type TextFieldProps as AriaTextFieldProps,
} from "react-aria-components";

import { cn } from "../utils";
import { limitExceededLabel, overLimitLabel } from "../i18n";
import { FieldDescription, FieldError, FieldLabel } from "./field-parts";
import { InputGroup } from "./input-group";
import { FIELD_STACK, INPUT } from "./styles";
import { useFieldValidation, type RequiredValidation } from "./validation";
import { splitDataAttributes } from "./data-attributes";

/** The field is 72px minimum, grows with the content up to 240px, then scrolls (design). */
export const TEXTAREA_MIN_HEIGHT = 72;
export const TEXTAREA_MAX_HEIGHT = 240;
/** The frame's block padding (`py-ds-100` × 2); the textarea itself gets the rest. */
const FRAME_PADDING = 16;

export type TextAreaProps = Omit<AriaTextFieldProps, "className" | "style" | "children" | "maxLength"> & {
  label: React.ReactNode;
  /**
   * Keeps the label for screen readers only: it still names the field, but takes no
   * space. For a field whose purpose the surface already shows, such as a chat reply box under its
   * conversation. A visible label stays the default.
   */
  isLabelHidden?: boolean;
  description?: React.ReactNode;
  errorMessage?: React.ReactNode;
  isOptional?: boolean;
  placeholder?: string;
  /**
   * Shows the counter. The user may type or paste past it; the field turns
   * invalid and blocks on submit, so pasted text is never cut silently.
   */
  maxLength?: number;
  /**
   * Shows the "89 / 500" count under the field; `true` by default whenever `maxLength`
   * is set. `false` hides only the visible count: the limit still marks the field invalid past
   * `maxLength`, and screen readers still hear when it is exceeded.
   */
  showCounter?: boolean;
  /**
   * Who says an empty required field is missing: `field` (default) or `app`. With `app` a DS
   * Form's `onSubmit` runs with the field empty, and the app's own error must clear on change. See
   * {@link RequiredValidation} for the whole contract.
   */
  requiredValidation?: RequiredValidation;
};

/** Grows the textarea to its content between the design's minimum and maximum height. */
function measure(node: HTMLTextAreaElement) {
  node.style.height = "auto";
  const min = TEXTAREA_MIN_HEIGHT - FRAME_PADDING;
  const max = TEXTAREA_MAX_HEIGHT - FRAME_PADDING;
  node.style.height = `${Math.min(Math.max(node.scrollHeight, min), max)}px`;
  node.style.overflowY = node.scrollHeight > max ? "auto" : "hidden";
}

/** Re-measures on every value change and whenever the width changes (wrapping, fonts, layout). */
function useAutoGrow(ref: React.RefObject<HTMLTextAreaElement | null>, value: string) {
  React.useLayoutEffect(() => {
    if (ref.current) measure(ref.current);
  }, [ref, value]);
  React.useEffect(() => {
    const node = ref.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    let width = node.clientWidth;
    const observer = new ResizeObserver(() => {
      if (node.clientWidth !== width) {
        width = node.clientWidth;
        measure(node);
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref]);
}

/** Multi-line text: notes, damage reports, messages. */
export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { label, isLabelHidden, description, errorMessage, isOptional, placeholder, maxLength, showCounter = true, value, defaultValue, onChange, validate, onBlur, requiredValidation, ...rest },
  forwardedRef,
) {
  const { locale } = useLocale();
  const local = React.useRef<HTMLTextAreaElement | null>(null);
  const ref = React.useCallback(
    (node: HTMLTextAreaElement | null) => {
      local.current = node;
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    },
    [forwardedRef],
  );
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue ?? "");
  const text = value ?? uncontrolled;
  useAutoGrow(local, text);

  const over = maxLength !== undefined ? text.length - maxLength : 0;
  const limitCheck = React.useCallback(
    (current: string) => {
      if (maxLength !== undefined && current.length > maxLength) return overLimitLabel(locale, current.length - maxLength);
      return validate?.(current);
    },
    [locale, maxLength, validate],
  );
  const timing = useFieldValidation<string>({
    validate: limitCheck,
    value: value,
    initialValue: value ?? defaultValue ?? "",
    isRequired: rest.isRequired,
    requiredValidation,
    onBlur: onBlur as ((event: React.FocusEvent) => void) | undefined,
    onChange,
    validationBehavior: rest.validationBehavior,
  });
  const counterId = React.useId();
  const counted = maxLength !== undefined && showCounter;
  const { wrapperProps, controlData } = splitDataAttributes(rest);

  return (
    <AriaTextField
      {...wrapperProps}
      value={text}
      onChange={(next) => {
        if (value === undefined) setUncontrolled(next);
        timing.onChange?.(next);
      }}
      validationBehavior={timing.validationBehavior}
      validate={timing.validate}
      onBlur={timing.onBlur}
      aria-describedby={[rest["aria-describedby"], counted ? counterId : undefined].filter(Boolean).join(" ") || undefined}
      data-slot="text-area"
      className={FIELD_STACK}
    >
      {({ isInvalid, isDisabled }) => (
        <>
          {isLabelHidden ? (
            <AriaLabel data-slot="field-label" className="sr-only">
              {label}
            </AriaLabel>
          ) : (
            <FieldLabel isRequired={rest.isRequired} isOptional={isOptional}>
              {label}
            </FieldLabel>
          )}
          <InputGroup multiline isDisabled={isDisabled} isInvalid={isInvalid}>
            <AriaTextArea
              {...controlData}
              ref={ref}
              placeholder={placeholder}
              data-slot="text-area-input"
              className={cn(INPUT, "text-body resize-none")}
              style={{ minHeight: TEXTAREA_MIN_HEIGHT - FRAME_PADDING }}
            />
          </InputGroup>
          {(description || counted) && (
            <div className="flex items-start justify-between gap-ds-200">
              {description ? <FieldDescription>{description}</FieldDescription> : <span />}
              {counted && (
                <span
                  id={counterId}
                  data-slot="text-area-counter"
                  // "89 / 500" in every locale: on an RTL page the bidi algorithm would show "500 / 89".
                  dir="ltr"
                  className={cn("shrink-0 text-body-small tabular-nums", over > 0 ? "text-ds-text-danger" : "text-ds-text-subtlest")}
                >
                  {new Intl.NumberFormat(locale).format(text.length)} / {new Intl.NumberFormat(locale).format(maxLength)}
                </span>
              )}
            </div>
          )}
          {maxLength !== undefined && (
            <span aria-live="polite" data-slot="text-area-limit-status" className="sr-only">
              {over > 0 ? limitExceededLabel(locale) : ""}
            </span>
          )}
          <FieldError>{over > 0 ? undefined : errorMessage}</FieldError>
        </>
      )}
    </AriaTextField>
  );
});
