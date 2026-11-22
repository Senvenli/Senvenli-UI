"use client";

import * as React from "react";
import {
  Input,
  TextField as AriaTextField,
  type TextFieldProps as AriaTextFieldProps,
} from "react-aria-components";

import { cn } from "../utils";
import { FieldDescription, FieldError, FieldLabel } from "./field-parts";
import { FIELD_STACK } from "./styles";
import { useFieldValidation, type RequiredValidation } from "./validation";

export type OtpFieldProps = Omit<
  AriaTextFieldProps,
  "className" | "style" | "children" | "type" | "inputMode" | "autoComplete" | "maxLength"
> & {
  label: React.ReactNode;
  /** 4 or 6 digits; 6 splits 3 + 3 with a dash. */
  length?: 4 | 6;
  description?: React.ReactNode;
  /** Say what to do: "Wrong code. Enter the latest code from your phone." */
  errorMessage?: React.ReactNode;
  /** Called once the last digit is entered (submit there). */
  onComplete?: (code: string) => void;
  /**
   * Who says an empty required field is missing: `field` (default) or `app`. With `app` a DS
   * Form's `onSubmit` runs with the field empty, and the app's own error must clear on change. See
   * {@link RequiredValidation} for the whole contract.
   */
  requiredValidation?: RequiredValidation;
};

/**
 * A one-time code: one real input with `autocomplete="one-time-code"` and a
 * numeric keypad, so SMS autofill and paste fill every box at once; the
 * boxes are only its picture. React Aria has no OTP primitive, so this is a TextField with a visual layer.
 */
/**
 * The digits to keep from the input's text. The caret is pinned to the end,
 * so a full code pasted or autofilled over an old one arrives appended
 * ("111111" + "222222"): when a whole code was added, the new one wins.
 */
function takeCode(text: string, previous: string, length: number) {
  const digits = text.replace(/\D/g, "");
  if (digits.length > length && digits.length - previous.length >= length) return digits.slice(-length);
  return digits.slice(0, length);
}

export const OtpField = React.forwardRef<HTMLInputElement, OtpFieldProps>(function OtpField(
  { label, length = 6, description, errorMessage, onComplete, value, defaultValue, onChange, validate, onBlur, requiredValidation, ...rest },
  ref,
) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue ?? "");
  const code = (value ?? uncontrolled).replace(/\D/g, "").slice(0, length);
  const [focused, setFocused] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const setRefs = (node: HTMLInputElement | null) => {
    inputRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  };

  const active = Math.min(code.length, length - 1);
  // The last code passed to onComplete: a new full code (pasted over an old one) completes again.
  const completed = React.useRef<string | null>(code.length === length ? code : null);
  const timing = useFieldValidation<string>({
    validate,
    value: value === undefined ? undefined : code,
    initialValue: defaultValue ?? "",
    isRequired: rest.isRequired,
    requiredValidation,
    onBlur: onBlur as ((event: React.FocusEvent) => void) | undefined,
    onChange: (digits) => {
      if (value === undefined) setUncontrolled(digits);
      onChange?.(digits);
      if (digits.length === length) {
        if (completed.current !== digits) {
          completed.current = digits;
          onComplete?.(digits);
        }
      } else completed.current = null;
    },
    validationBehavior: rest.validationBehavior,
  });
  const pinCaret = (input: HTMLInputElement) => {
    const end = input.value.length;
    if (input.selectionStart !== end || input.selectionEnd !== end) input.setSelectionRange(end, end);
  };
  return (
    <AriaTextField
      {...rest}
      value={code}
      validationBehavior={timing.validationBehavior}
      validate={timing.validate}
      onBlur={timing.onBlur}
      onChange={(next) => timing.onChange?.(takeCode(next, code, length))}
      data-slot="otp-field"
      className={FIELD_STACK}
    >
      {({ isInvalid, isDisabled }) => (
        <>
          <FieldLabel isRequired={rest.isRequired}>{label}</FieldLabel>
          <div
            data-slot="otp-field-boxes"
            // As wide as its cells, never wider than its column: on a narrow phone the cells shrink instead
            // of pushing the field (and the page) sideways. Codes read left to right in every locale, so the row
            // (cells, separator and the hidden input) stays LTR on an RTL page: "1234" never shows as "4 3 2 1".
            dir="ltr"
            className="relative flex w-full max-w-fit items-center gap-ds-100"
            onMouseDown={(event) => {
              event.preventDefault();
              inputRef.current?.focus();
            }}
          >
            <Input
              ref={setRefs}
              inputMode="numeric"
              autoComplete="one-time-code"
              // No maxLength: the browser would cut "482 917" to six characters before the digits are picked out.
              pattern="\d*"
              data-slot="otp-field-input"
              onFocus={(event) => {
                setFocused(true);
                pinCaret(event.currentTarget);
              }}
              // Boxes fill left to right: arrows, Home and clicks never move the caret off the end.
              onSelect={(event) => pinCaret(event.currentTarget)}
              onKeyUp={(event) => pinCaret(event.currentTarget)}
              onBlur={() => setFocused(false)}
              className="absolute inset-0 z-10 h-full w-full cursor-text bg-transparent text-transparent caret-transparent outline-hidden selection:bg-transparent"
            />
            {Array.from({ length }, (_, index) => (
              <React.Fragment key={index}>
                {length === 6 && index === 3 && (
                  <span aria-hidden="true" data-slot="otp-field-separator" className="h-0.5 w-ds-100 shrink-0 rounded-ds-full bg-ds-border-bold" />
                )}
                <span
                  aria-hidden="true"
                  data-slot="otp-field-box"
                  data-active={focused && index === active ? true : undefined}
                  className={cn(
                    "relative inline-flex h-13 w-11 min-w-0 items-center justify-center rounded-ds-medium border bg-ds-background-input",
                    "text-metric-medium tabular-nums text-ds-text",
                    isInvalid ? "border-ds-border-danger" : "border-ds-border-bold",
                    focused && index === active && "border-ds-border-focused outline-1 outline-solid -outline-offset-2 outline-ds-border-focused",
                    isDisabled && "border-transparent bg-ds-background-disabled text-ds-text-disabled",
                  )}
                >
                  {code[index] ?? ""}
                  {focused && index === active && code.length < length && (
                    <span className="h-5 w-px animate-pulse bg-ds-text motion-reduce:animate-none" />
                  )}
                </span>
              </React.Fragment>
            ))}
          </div>
          {description && <FieldDescription>{description}</FieldDescription>}
          <FieldError>{errorMessage}</FieldError>
        </>
      )}
    </AriaTextField>
  );
});
