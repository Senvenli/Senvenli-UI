"use client";

import * as React from "react";
import { Input, TextField as AriaTextField, useLocale, type TextFieldProps as AriaTextFieldProps } from "react-aria-components";

import { cn } from "../utils";
import { hidePasswordLabel, showPasswordLabel, strengthLabels } from "../i18n";
import { FieldDescription, FieldError, FieldLabel } from "./field-parts";
import { InputAction, InputGroup } from "./input-group";
import { FIELD_STACK, INPUT } from "./styles";
import { useFieldValidation, type RequiredValidation } from "./validation";
import { splitDataAttributes } from "./data-attributes";

export type PasswordStrength = 0 | 1 | 2 | 3;

/**
 * A simple, explainable score: 1 weak, 2 fair (8+ characters, two kinds),
 * 3 strong (10+ characters, three kinds of lower, upper, digit, symbol).
 * 0 is an empty value.
 */
export function passwordStrength(value: string): PasswordStrength {
  if (!value) return 0;
  const kinds = [/\p{Ll}/u, /\p{Lu}/u, /\p{Nd}/u, /[^\p{L}\p{Nd}]/u].filter((pattern) => pattern.test(value)).length;
  if (value.length >= 10 && kinds >= 3) return 3;
  if (value.length >= 8 && kinds >= 2) return 2;
  return 1;
}

const FILLED = { 1: 2, 2: 3, 3: 4 } as const;

export type PasswordFieldProps = Omit<AriaTextFieldProps, "className" | "style" | "children" | "type"> & {
  label: React.ReactNode;
  /** `current-password` to sign in, `new-password` to create or reset. */
  autoComplete: "current-password" | "new-password";
  /** The requirements, stated up front ("At least 10 characters"). */
  description?: React.ReactNode;
  errorMessage?: React.ReactNode;
  /** Four-segment meter with a word under it (create and reset only). */
  showStrength?: boolean;
  placeholder?: string;
  /**
   * Controlled visibility: `true` shows the value as text. Leave it out for the
   * default, where the show / hide button alone decides; set it when the app
   * writes a value the person should see (a "Generate" button).
   */
  isRevealed?: boolean;
  /** Called with the next visibility when the show / hide button is pressed. */
  onRevealChange?: (revealed: boolean) => void;
  /**
   * Who says an empty required field is missing: `field` (default) or `app`. With `app` a DS
   * Form's `onSubmit` runs with the field empty, and the app's own error must clear on change. See
   * {@link RequiredValidation} for the whole contract.
   */
  requiredValidation?: RequiredValidation;
};

/** A password with a show / hide toggle; never blocks paste and never clears itself. */
export const PasswordField = React.forwardRef<HTMLInputElement, PasswordFieldProps>(function PasswordField(
  {
    label, description, errorMessage, showStrength, autoComplete, placeholder, isRevealed, onRevealChange,
    value, defaultValue, onChange, validate, onBlur, requiredValidation, ...rest
  },
  ref,
) {
  const { locale } = useLocale();
  const [ownVisible, setOwnVisible] = React.useState(false);
  const visible = isRevealed ?? ownVisible;
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue ?? "");
  const text = value ?? uncontrolled;
  const score = passwordStrength(text);
  const words = strengthLabels(locale);
  const timing = useFieldValidation({
    validate,
    value: value,
    initialValue: value ?? defaultValue ?? "",
    isRequired: rest.isRequired,
    requiredValidation,
    onBlur: onBlur as ((event: React.FocusEvent) => void) | undefined,
    onChange,
    validationBehavior: rest.validationBehavior,
  });

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
      type={visible ? "text" : "password"}
      autoComplete={autoComplete}
      data-slot="password-field"
      className={FIELD_STACK}
    >
      {({ isInvalid, isDisabled }) => (
        <>
          <FieldLabel isRequired={rest.isRequired}>{label}</FieldLabel>
          <InputGroup isDisabled={isDisabled} isInvalid={isInvalid}>
            <Input {...controlData} ref={ref} placeholder={placeholder} data-slot="password-field-input" className={cn(INPUT, "text-body")} />
            <InputAction
              icon={visible ? "eye-off" : "eye"}
              aria-label={visible ? hidePasswordLabel(locale) : showPasswordLabel(locale)}
              onPress={() => {
                if (isRevealed === undefined) setOwnVisible(!visible);
                onRevealChange?.(!visible);
              }}
              isDisabled={isDisabled}
            />
          </InputGroup>
          {description && <FieldDescription>{description}</FieldDescription>}
          {showStrength && (
            <div data-slot="password-strength" className="flex flex-col gap-ds-050">
              {score > 0 && (
                // Slides in as the first character is typed; segments fill with a colour transition (still under
                // reduced motion: no movement).
                <div
                  aria-hidden="true"
                  data-slot="password-strength-meter"
                  className="grid grid-cols-4 gap-ds-050 transition-[translate,opacity] duration-(--ds-duration-medium) ease-ds-enter starting:-translate-y-1 starting:opacity-0 motion-reduce:transition-none"
                >
                  {[0, 1, 2, 3].map((index) => (
                    <span
                      key={index}
                      data-filled={index < FILLED[score as 1 | 2 | 3] || undefined}
                      className={cn(
                        "h-1 rounded-ds-full bg-ds-background-neutral transition-colors duration-(--ds-duration-medium) motion-reduce:transition-none",
                        index < FILLED[score as 1 | 2 | 3] && (score === 3 ? "bg-ds-icon-success" : "bg-ds-icon-warning"),
                      )}
                    />
                  ))}
                </div>
              )}
              {/* Mounted empty so the first word is announced too. */}
              <span
                aria-live="polite"
                data-slot="password-strength-label"
                className={cn("text-body-small", score === 3 ? "text-ds-text-success" : "text-ds-text-warning")}
              >
                {score > 0 ? words[score - 1] : ""}
              </span>
            </div>
          )}
          <FieldError>{errorMessage}</FieldError>
        </>
      )}
    </AriaTextField>
  );
});
