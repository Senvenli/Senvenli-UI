"use client";

import * as React from "react";
import { Radio as AriaRadio, RadioGroup as AriaRadioGroup, type RadioGroupProps as AriaRadioGroupProps } from "react-aria-components";

import { cn } from "../utils";
import { FieldDescription, FieldError, FieldLabel } from "../form/field-parts";
import { FIELD_STACK } from "../form/styles";
import { useRequiredChoice, type RequiredValidation } from "../form/validation";
import { useChoiceText } from "./choice-text";
import { CHOICE_ROW, RADIO_CARD, RADIO_DOT } from "./styles";

/** How a RadioGroup draws its options: rows with a dot, or cards (the whole card is the hit target). */
export type RadioGroupVariant = "default" | "card";
const RadioVariant = React.createContext<RadioGroupVariant>("default");

export type RadioProps = {
  value: string;
  children: React.ReactNode;
  description?: React.ReactNode;
  isDisabled?: boolean;
};

/**
 * One option of a RadioGroup; the whole row (or card) is the hit target. Named by its children, described by
 * `description`; in a card group the children can hold any content (a title with a Lozenge, a price).
 */
export const Radio = React.forwardRef<HTMLLabelElement, RadioProps>(function Radio({ children, description, ...rest }, ref) {
  const text = useChoiceText(description, undefined);
  const variant = React.useContext(RadioVariant);
  return (
    <AriaRadio
      {...rest}
      ref={ref}
      aria-labelledby={text.labelId}
      aria-describedby={text.describedBy}
      data-slot="radio"
      data-variant={variant}
      className={variant === "card" ? RADIO_CARD : CHOICE_ROW}
    >
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
  /**
   * `default`: rows with a dot. `card`: each option a card in a grid of equal columns (no narrower than 180px), for
   * choices that need a line of detail each (a plan, a delivery option, a time slot).
   */
  variant?: RadioGroupVariant;
};

type GroupRequiredProps = Pick<
  AriaRadioGroupProps,
  "value" | "defaultValue" | "onChange" | "onBlur" | "isRequired" | "isInvalid" | "validationBehavior"
> & {
  errorMessage?: React.ReactNode;
  requiredValidation?: RequiredValidation;
};

/**
 * RadioGroup's required check: React Aria never finds a group with nothing chosen
 * missing under `aria` validation. The chosen value is followed (the app's, or the one React Aria reports, a form
 * reset included) without taking control of the group. Not a public export.
 */
export function useRadioGroupRequired({
  value,
  defaultValue,
  onChange,
  onBlur,
  isRequired,
  isInvalid,
  validationBehavior,
  errorMessage,
  requiredValidation,
}: GroupRequiredProps) {
  const [own, setOwn] = React.useState<string | null>(value ?? defaultValue ?? null);
  const current = value !== undefined ? value : own;
  const required = useRequiredChoice({
    filled: current !== null && current !== "",
    isRequired,
    requiredValidation,
    isInvalid,
    errorMessage,
    validationBehavior,
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
export function RadioGroup({
  label,
  items,
  children,
  description,
  errorMessage: errorMessageProp,
  orientation = "vertical",
  requiredValidation,
  variant = "default",
  ...rest
}: RadioGroupProps) {
  const { errorMessage, groupProps } = useRadioGroupRequired({ ...rest, errorMessage: errorMessageProp, requiredValidation });
  return (
    <AriaRadioGroup
      {...rest}
      {...groupProps}
      orientation={orientation}
      data-slot="radio-group"
      data-variant={variant}
      className={FIELD_STACK}
    >
      <FieldLabel isRequired={rest.isRequired}>{label}</FieldLabel>
      <RadioVariant.Provider value={variant}>
        <div
          data-slot="radio-group-items"
          className={cn(
            variant === "card"
              ? "grid grid-cols-[repeat(auto-fit,minmax(min(180px,100%),1fr))] gap-ds-150"
              : cn("flex gap-ds-100", orientation === "vertical" ? "flex-col items-start" : "flex-wrap gap-x-ds-300"),
          )}
        >
          {items
            ? items.map((item) => (
                <Radio key={item.value} value={item.value} description={item.description} isDisabled={item.isDisabled}>
                  {item.label}
                </Radio>
              ))
            : children}
        </div>
      </RadioVariant.Provider>
      {description && <FieldDescription>{description}</FieldDescription>}
      <FieldError>{errorMessage}</FieldError>
    </AriaRadioGroup>
  );
}
