"use client";

import * as React from "react";
import { Input, TextField as AriaTextField, type TextFieldProps as AriaTextFieldProps } from "react-aria-components";
import { isIconElement } from "../display/icon";

import { cn } from "../utils";
import { useFieldSize } from "../defaults";
import { ControlFieldError, FieldDescription, FieldLabel, forwardedInvalid, useErrorRowLink } from "./field-parts";
import { InputAddon, InputGroup } from "./input-group";
import { FIELD_ICON, FIELD_STACK, INPUT, type FieldSize } from "./styles";
import { useFieldValidation, type RequiredValidation } from "./validation";
import { splitDataAttributes } from "./data-attributes";

export type TextFieldProps = Omit<AriaTextFieldProps, "className" | "style" | "children"> & {
  /** Always given; the label sits above the field, never inside it. */
  label: React.ReactNode;
  description?: React.ReactNode;
  /** What happened and what to do ("Enter a valid email: name@example.com"). */
  errorMessage?: React.ReactNode;
  /** Shows "(optional)" when most of the form is required. */
  isOptional?: boolean;
  /**
   * Who says an empty required field is missing: `field` (default) or `app`. With `app` a DS
   * Form's `onSubmit` runs with the field empty, and the app's own error must clear on change. See
   * {@link RequiredValidation} for the whole contract.
   */
  requiredValidation?: RequiredValidation;
  placeholder?: string;
  /** Text, unit or currency before the value ("€", "https://"), or `<Icon name="search" />`. */
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  /** Extra controls at the end of the frame (`InputAction`). */
  actions?: React.ReactNode;
  size?: FieldSize;
  /** `code` for codes, references and IDs; `numeric` for money, distance and counts. */
  variant?: "text" | "code" | "numeric";
  /**
   * `uppercase` shows the value in capitals (a code: "ab 123" reads "AB 123"); display only
   *. The input's value, `onChange` and the submitted form value stay exactly as
   * typed; the caret and selection follow the text as drawn. Capitals follow the page's language, as CSS
   * `text-transform` does (`lang="tr"`: "i" shows as "İ"), the same as `toLocaleUpperCase` in that locale. The
   * placeholder keeps its own case. Normalise the stored value in the app if it must be capitals.
   */
  displayCase?: "uppercase";
  /**
   * Mobile keyboards' capitalization: `none` for e-mail and codes, `characters` for codes, `words` for names.
   * React Aria's TextField forwards it to the input (useTextField reads it); its types leave it out, so it is declared here.
   */
  autoCapitalize?: React.InputHTMLAttributes<HTMLInputElement>["autoCapitalize"];
  /**
   * Set by a form row that owns the error text (the shared `Field` hands its control `aria-invalid`): the field
   * shows its invalid state as with `isInvalid`, and without an `errorMessage` of its own draws no error row,
   * so the row's message is the only one. It marks the input for assistive tech and draws it
   * invalid only: unlike `isInvalid` it never becomes the input's native validity, so it never blocks a form's
   * submit, and the field's own validation runs as without it.
   */
  "aria-invalid"?: boolean | "true" | "false";
  /** Bounds and step for `type="number"`; prefer NumberField for money and counts that need formatting. */
  min?: number | string;
  max?: number | string;
  step?: number | string;
  /**
   * `ltr` keeps the frame, addons and value, left to right on an RTL page: phone numbers, IBANs and
   * card numbers read LTR in every locale ("ME +382 67 412 908", never "908 412 67 ME +382"). The
   * label, help text and error still follow the page. On by default for `type` `url`, `email` and `tel`
   * (the placeholder then aligns LTR too); `inherit` turns that off and follows the page. Pass `ltr` for a
   * domain with URL addons: "https://shop.example.com", never "com. shop.example //:https".
   */
  valueDir?: "ltr" | "inherit";
};

/**
 * An `<Icon>` sits in the field as a subtle mark with the same slot as
 * SearchField's icon; text and other nodes become an addon. Pass the
 * `<Icon>` element itself (a wrapper component would read as an addon).
 */
function Affix({ value, position }: { value: React.ReactNode; position: "start" | "end" }) {
  if (isIconElement(value)) {
    return React.cloneElement(value as React.ReactElement<Record<string, unknown>>, {
      "data-slot": "field-icon",
      color: value.props.color ?? "subtle",
    });
  }
  return <InputAddon position={position}>{value}</InputAddon>;
}

/** Values that read left to right in every locale. */
const LTR_TYPES = new Set(["url", "email", "tel"]);

/** Type per appearance: `code` is the design's code style (Geist 13/20, tabular figures). */
export const APPEARANCE = {
  text: "text-body",
  code: "font-ds-mono text-code",
  numeric: "text-body tabular-nums",
} as const;

/** Capitals on the drawn value only; the placeholder keeps its case. */
const DISPLAY_UPPERCASE = "uppercase placeholder:normal-case";

/**
 * One line of text with a visible label, optional help text and an inline
 * error. React Aria wires label, description and error to the input and
 * sets `aria-invalid`; errors show on blur and on submit (the Form default).
 */
export const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  {
    label, description, errorMessage, isOptional, placeholder, prefix, suffix, actions, size: fieldSize, variant: appearance = "text", displayCase,
    min, max, step, valueDir, validate, onBlur, onChange, "aria-invalid": ariaInvalid, requiredValidation, ...rest
  },
  ref,
) {
  const size = useFieldSize(fieldSize);
  const timing = useFieldValidation({
    validate,
    value: rest.value,
    initialValue: rest.value ?? rest.defaultValue ?? "",
    isRequired: rest.isRequired,
    requiredValidation,
    onBlur: onBlur as ((event: React.FocusEvent) => void) | undefined,
    onChange,
    validationBehavior: rest.validationBehavior,
  });
  const forwarded = forwardedInvalid(ariaInvalid, rest.render);
  const { wrapperProps, controlData } = splitDataAttributes(rest);
  const errorRowLink = useErrorRowLink(forwarded.invalid, errorMessage);
  return (
    <AriaTextField {...wrapperProps} {...forwarded.fieldProps} {...errorRowLink} validationBehavior={timing.validationBehavior}
      validate={timing.validate} onBlur={timing.onBlur} onChange={timing.onChange} data-slot="text-field" className={FIELD_STACK}>
      {({ isInvalid, isDisabled }) => (
        <>
          <FieldLabel isRequired={rest.isRequired} isOptional={isOptional}>
            {label}
          </FieldLabel>
          <InputGroup size={size} isDisabled={isDisabled} isInvalid={isInvalid || forwarded.invalid} dir={valueDir === "inherit" ? undefined : (valueDir ?? (LTR_TYPES.has(rest.type ?? "") ? "ltr" : undefined))}>
            {prefix !== undefined && <Affix value={prefix} position="start" />}
            <Input
              {...controlData}
              ref={ref}
              {...(forwarded.invalid ? { "aria-invalid": true } : null)}
              placeholder={placeholder}
              min={min}
              max={max}
              step={step}
              data-slot="text-field-input"
              className={cn(INPUT, APPEARANCE[appearance], displayCase === "uppercase" && DISPLAY_UPPERCASE)}
            />
            {suffix !== undefined && <Affix value={suffix} position="end" />}
            {actions}
          </InputGroup>
          {description && <FieldDescription>{description}</FieldDescription>}
          <ControlFieldError forwardedInvalid={forwarded.invalid}>{errorMessage}</ControlFieldError>
        </>
      )}
    </AriaTextField>
  );
});
