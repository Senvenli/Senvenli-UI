"use client";

import * as React from "react";
import { Radio as AriaRadio, RadioGroup as AriaRadioGroup, type RadioGroupProps as AriaRadioGroupProps } from "react-aria-components";

import { cn } from "../utils";
import { FieldDescription, FieldError, FieldLabel } from "../form/field-parts";
import { FIELD_STACK } from "../form/styles";
import { useRequiredChoice, type RequiredValidation } from "../form/validation";
import { useChoiceText } from "./choice-text";
import { CHOICE_ROW, RADIO_DOT } from "./styles";

export type RadioProps = {
  value: string;
  children: React.ReactNode;
  description?: React.ReactNode;
  isDisabled?: boolean;
};

/** One option of a RadioGroup; the whole row is the hit target. */
export const Radio = React.forwardRef<HTMLLabelElement, RadioProps>(function Radio({ children, description, ...rest }, ref) {
  const text = useChoiceText(description, undefined);
  return (
    <AriaRadio {...rest} ref={ref} aria-labelledby={text.labelId} aria-describedby={text.describedBy} data-slot="radio" className={CHOICE_ROW}>
      <span aria-hidden="true" data-slot="radio-dot" className={RADIO_DOT} />
      {text.render(children)}
    </AriaRadio>
  );
});

export type RadioItem = { value: string; label: React.ReactNode; description?: React.ReactNode; isDisabled?: boolean };

export type RadioGroupProps = Omit<AriaRadioGroupProps, "children" | "className" | "style"> & {
  /** The group legend, required. */
  label: React.ReactNode;
  /** The options as data, or `Radio` children. */
  items?: readonly RadioItem[];
  children?: React.ReactNode;
  description?: React.ReactNode;
  errorMessage?: React.ReactNode;
  /**
   * Who says a required group with no option chosen is missing: `field` (default) shows
   * "Fill in this field." when focus leaves the group and on a DS Form submit, which it then blocks; `app` only
   * marks the group. See {@link RequiredValidation}.
   * The app's `isInvalid` (`true` with its `errorMessage`, or `false`) overrides the check, as on TextField. Disabled,
   * empty and required, it still blocks a DS Form's submit and cannot take focus (as TextField).
   */
  requiredValidation?: RequiredValidation;
};

type GroupRequiredProps = Pick<AriaRadioGroupProps, "value" | "defaultValue" | "onChange" | "onBlur" | "isRequired" | "isInvalid" | "validationBehavior"> & {
  errorMessage?: React.ReactNode;
  requiredValidation?: RequiredValidation;
};

/**
 * RadioGroup's and RadioCard's required check: React Aria never finds a group with nothing chosen
 * missing under `aria` validation. The chosen value is followed (the app's, or the one React Aria reports, a form
 * reset included) without taking control of the group. Not a public export.
 */
export function useRadioGroupRequired({ value, defaultValue, onChange, onBlur, isRequired, isInvalid, validationBehavior, errorMessage, requiredValidation }: GroupRequiredProps) {
  const [own, setOwn] = React.useState<string | null>(value ?? defaultValue ?? null);
  const current = value !== undefined ? value : own;
  const required = useRequiredChoice({
    filled: current !== null && current !== "", isRequired, requiredValidation, isInvalid, errorMessage, validationBehavior,
    onBlur: onBlur as ((event: React.FocusEvent) => void) | undefined,
  });
  return {
    errorMessage: required.errorMessage,
    groupProps: {
      isInvalid: required.isInvalid,
      onBlur: required.onBlur as AriaRadioGroupProps["onBlur"],
      onChange: (next: string) => {
        setOwn(next);
        onChange?.(next);
      },
    },
  };
}

/**
 * Exactly one of two to seven always-visible options. Tab enters and leaves
 * the group; arrow keys move the selection; focusing never selects by itself.
 */
export function RadioGroup({ label, items, children, description, errorMessage: errorMessageProp, orientation = "vertical", requiredValidation, ...rest }: RadioGroupProps) {
  const { errorMessage, groupProps } = useRadioGroupRequired({ ...rest, errorMessage: errorMessageProp, requiredValidation });
  return (
    <AriaRadioGroup {...rest} {...groupProps} orientation={orientation} data-slot="radio-group" className={FIELD_STACK}>
      <FieldLabel isRequired={rest.isRequired}>{label}</FieldLabel>
      <div
        data-slot="radio-group-items"
        className={cn("flex gap-ds-100", orientation === "vertical" ? "flex-col items-start" : "flex-wrap gap-x-ds-300")}
      >
        {items
          ? items.map((item) => (
              <Radio key={item.value} value={item.value} description={item.description} isDisabled={item.isDisabled}>
                {item.label}
              </Radio>
            ))
          : children}
      </div>
      {description && <FieldDescription>{description}</FieldDescription>}
      <FieldError>{errorMessage}</FieldError>
    </AriaRadioGroup>
  );
}
