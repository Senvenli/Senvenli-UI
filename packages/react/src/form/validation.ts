"use client";

import * as React from "react";
import { FormContext, useLocale } from "react-aria-components";

import { requiredLabel } from "../i18n";

/**
 * Form-wide state the fields read: `submitted` turns on every field's errors
 * at the first submit; `resetCount` changes on form reset so fields forget
 * what they showed; `inForm` is true only inside a DS Form (PhoneField's required check).
 */
export const FormSubmittedContext = React.createContext({ submitted: false, resetCount: 0, inForm: false });

type ValidationResult = string | string[] | true | null | undefined;
type Validate<T> = ((value: T) => ValidationResult) | undefined;

const isEmptyValue = (value: unknown) =>
  value === undefined || value === null || (typeof value === "number" && Number.isNaN(value)) ||
  (typeof value === "string" && value.trim() === "");

function firstError(result: ValidationResult): string | string[] | null {
  if (result === true || result === null || result === undefined) return null;
  if (Array.isArray(result)) return result.length ? result : null;
  return result || null;
}

/**
 * Who says an empty required field is missing: the `requiredValidation` prop of TextField,
 * PasswordField, TextArea, NumberField, InputOTP, DateField, TimeField, DatePicker and DateRangeField, and since
 * of Select, MultiSelect, ComboBox, Autocomplete, RadioGroup, Checkbox, CheckboxGroup,
 * ColorField and PhoneField (empty there: no chosen item, no tag, nothing checked; see {@link useRequiredChoice}).
 *
 * - `field` (default): the field itself, with "Fill in this field." on blur and on a DS Form submit, which it
 *   then blocks.
 * - `app`: `isRequired` only marks the field (the label's `*`, `aria-required`); an empty value is never the
 *   field's error, on blur or on submit. A DS Form's `onSubmit` therefore runs with the field empty: the app
 *   checks it there and shows its own error through `isInvalid` and `errorMessage`.
 *
 * The app's error must clear as soon as the value changes: a DS Form never calls `onSubmit` while any field
 * is `aria-invalid` (form.tsx), so an error left on after the user filled the field blocks every later submit.
 *
 * The app's own `isInvalid`, with either value, overrides the field's required check (React Aria's controlled
 * `isInvalid`), on every field listed here and with either `requiredValidation`:
 * - `isInvalid` with an `errorMessage`: the app's message is the one shown, never "Fill in this field.";
 * - `isInvalid={false}`: the field is valid however empty it is, and does not block a DS Form's submit. On the text,
 *   number and date fields it also overrides `validate`, `maxLength` and the impossible date; PhoneField's own
 *   length check still shows. So when there is no error, pass `isInvalid={undefined}` (or leave it out) to keep the
 *   field's checks; pass `false` only when the app owns the field's validity.
 * PhoneField also counts an `errorMessage` passed without `isInvalid` as the app's error (its own contract: the
 * message makes it invalid); on the other fields such a message shows only when the field is invalid, and the
 * field's own message wins.
 *
 * A required field that is empty and disabled is still empty: with `field` it blocks a DS Form's submit like any
 * other, and since a disabled control cannot take focus the form moves focus nowhere for it (TextField's behaviour
 * since, the selection fields' since). Drop `isRequired` while the field is disabled, fill
 * it, or use `app`.
 *
 * `validate`, TextArea's `maxLength` and the date fields' impossible-date message keep their timing (blur and
 * submit) with either value. With `validationBehavior="native"` the browser owns required and this has no effect,
 * except on PhoneField, which never uses native validity: inside any DS Form (`aria` or `native`) it runs the DS
 * check, and outside a DS Form it shows nothing for an empty value.
 */
export type RequiredValidation = "field" | "app";

type Options<T> = {
  validate: Validate<T>;
  /** The field's starting value (`value ?? defaultValue`), so a blur on an untouched field is judged correctly. */
  initialValue?: T;
  /** The controlled value, when the field is controlled. */
  value?: T;
  isRequired?: boolean;
  /** `app`: `isRequired` only marks the field; the empty value is never this hook's error. */
  requiredValidation?: RequiredValidation;
  onBlur?: (event: React.FocusEvent) => void;
  onChange?: (value: T) => void;
  validationBehavior?: "aria" | "native";
};

/**
 * The design's timing (Form README): errors appear on blur and on submit, never
 * while typing. Once a blur has shown an error, the message stays current
 * while the user edits and disappears the moment the value is valid; after
 * that, a new error waits for the next blur. After the first submit every
 * field shows its current error live (the user asked to submit).
 *
 * `isRequired` is checked here too: React Aria's `aria` behaviour only sets
 * `aria-required`, so an empty required field would otherwise never be
 * invalid and never block submit. With `requiredValidation: "app"` it is not: the field stays marked
 * required (the label's `*` and React Aria's `aria-required`, both from `isRequired`), but an empty value is
 * never an error here, on blur or on submit; the app validates and passes `isInvalid` / `errorMessage`.
 *
 * With `validationBehavior="native"` the browser owns the timing, so the
 * field's `validate` is passed through untouched.
 */
export function useFieldValidation<T>({
  validate, initialValue, value: controlled, isRequired, requiredValidation = "field", onBlur, onChange, validationBehavior,
}: Options<T>) {
  const { locale } = useLocale();
  const { submitted, resetCount } = React.useContext(FormSubmittedContext);
  const form = React.useContext(FormContext) as { validationBehavior?: "aria" | "native" } | null;
  const behavior = validationBehavior ?? form?.validationBehavior ?? "aria";
  // True from a blur that found an error until the value is valid again.
  const [showing, setShowing] = React.useState(false);
  // React's "adjust state on a prop change" pattern, so a discarded render cannot lose a reset.
  const [seenReset, setSeenReset] = React.useState(resetCount);
  if (seenReset !== resetCount) {
    setSeenReset(resetCount);
    setShowing(false);
  }
  const latest = React.useRef<T | undefined>(initialValue);
  // A reset puts the field back to its initial value; the next blur judges that, not the last typed one.
  const resetFor = React.useRef(resetCount);
  if (resetFor.current !== resetCount) {
    resetFor.current = resetCount;
    latest.current = initialValue;
  }
  if (controlled !== undefined) latest.current = controlled;

  const check = React.useCallback(
    (value: T) => {
      if (isRequired && requiredValidation !== "app" && isEmptyValue(value)) return requiredLabel(locale);
      return firstError(validate?.(value));
    },
    [isRequired, requiredValidation, locale, validate],
  );

  if (behavior === "native") {
    return { validationBehavior: behavior, validate, onBlur, onChange: onChange ? (value: T) => onChange(value) : undefined };
  }

  return {
    validationBehavior: behavior,
    validate: (value: T) => {
      const error = check(value);
      return error && (submitted || showing) ? error : null;
    },
    onChange: (value: T) => {
      latest.current = value;
      if (showing && !check(value)) setShowing(false);
      onChange?.(value);
    },
    onBlur: (event: React.FocusEvent) => {
      // Only a blur that leaves an error turns errors on; a valid blur keeps them hidden while typing.
      setShowing(Boolean(check(latest.current as T)));
      onBlur?.(event);
    },
  };
}

type RequiredChoiceOptions = {
  /** Whether the field holds a value: a chosen key, a tag, a checked box, a typed text or number. */
  filled: boolean;
  isRequired?: boolean;
  requiredValidation?: RequiredValidation;
  /**
   * The caller's own `isInvalid`. Set (`true` or `false`), it owns the field's validity and the required check
   * stays out, as React Aria's controlled `isInvalid` does on TextField; unset, it is `undefined` here too.
   */
  isInvalid?: boolean;
  /** The caller's own `errorMessage`: shown with its `isInvalid`, and whenever the field has no required error. */
  errorMessage?: React.ReactNode;
  /**
   * The field's own `validationBehavior`, when it has one (PhoneField passes `aria` inside a DS Form and `native`
   * outside one). Unset, the surrounding form's, else React Aria's default (`native`).
   */
  validationBehavior?: "aria" | "native";
  onBlur?: (event: React.FocusEvent) => void;
};

/**
 * "Required" for the fields React Aria never finds empty under `aria` validation: Select,
 * MultiSelect, ComboBox, Autocomplete, RadioGroup, Checkbox, CheckboxGroup, ColorField and
 * PhoneField. React Aria's `aria` behaviour has no required check of its own (the browser's `valueMissing` is
 * read only under `native`), and it never runs `validate` on an empty selection (a null key, no keys), so an
 * empty required field of these was never invalid: a DS Form called `onSubmit` with it empty, showed nothing and
 * focused nothing. The text, number and date fields have their check in {@link useFieldValidation}; these get the
 * same one, with the same timing and the same `requiredValidation` opt-out:
 *
 * - an empty required field shows "Fill in this field." after a blur that leaves it empty, and from a DS Form's
 *   first submit on, which it then blocks (the form focuses the first invalid field, in document order);
 * - a value clears the message at once; after a blur-shown error is cleared, a new one waits for the next blur;
 * - a form reset hides it again;
 * - `requiredValidation="app"`: `isRequired` only marks the field (the label's `*`, `aria-required`).
 *
 * The field is then marked invalid through React Aria's controlled `isInvalid` (its `data-invalid`, the input's
 * `aria-invalid`), with the message as its error. The caller's own `isInvalid`, `true` or `false`, overrides the
 * check, as on TextField (see {@link RequiredValidation}): `true` with its `errorMessage` shows the app's message,
 * never the DS one, and `false` keeps the field valid. Without a required error the caller's `isInvalid` and
 * `errorMessage` pass through unchanged, so a form's server errors (`validationErrors`) still show. Under `native`
 * validation the browser owns required (React Aria's hidden select or input carries `required`) and nothing here
 * applies.
 */
export function useRequiredChoice({
  filled, isRequired, requiredValidation, isInvalid, errorMessage, validationBehavior, onBlur,
}: RequiredChoiceOptions) {
  const form = React.useContext(FormContext) as { validationBehavior?: "aria" | "native" } | null;
  const behavior = validationBehavior ?? form?.validationBehavior ?? "native";
  const value = filled ? true : null;
  const timing = useFieldValidation<true | null>({ validate: undefined, value, initialValue: value, isRequired, requiredValidation, onBlur, validationBehavior: behavior });
  // A change of value is the field's onChange for the timing: a value clears a blur-shown error.
  const [seen, setSeen] = React.useState(filled);
  if (seen !== filled) {
    setSeen(filled);
    timing.onChange?.(value);
  }
  // The app's controlled `isInvalid` owns validity, as React Aria's does on TextField: no DS required error then.
  const appOwns = isInvalid !== undefined;
  const error = behavior === "aria" && !appOwns ? (timing.validate?.(value) ?? null) : null;
  const message = typeof error === "string" ? error : Array.isArray(error) ? error.join(" ") : null;
  return {
    isInvalid: message ? true : isInvalid,
    errorMessage: message ?? errorMessage,
    onBlur: timing.onBlur,
    /**
     * Whether this hook's required message can appear on the field: `isRequired`, `aria` validation (a DS Form's, or
     * the field's own), `requiredValidation` not `app`, and no `isInvalid` from the app. A field whose error sits in an
     * always-mounted live region (a lone Checkbox) keeps that region mounted, empty, while this is true,
     * so the message appears inside the same node and is announced.
     */
    checksRequired: behavior === "aria" && !appOwns && Boolean(isRequired) && requiredValidation !== "app",
  };
}
