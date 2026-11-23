"use client";

import * as React from "react";
import {
  Checkbox as AriaCheckbox,
  CheckboxGroup as AriaCheckboxGroup,
  CheckboxGroupStateContext,
  type CheckboxGroupProps as AriaCheckboxGroupProps,
} from "react-aria-components";
import { IconGlyph } from "../display/icon";

import { cn } from "../utils";
import { FieldDescription, FieldError, FieldLabel } from "../form/field-parts";
import { FIELD_STACK } from "../form/styles";
import { useRequiredChoice, type RequiredValidation } from "../form/validation";
import { useChoiceText } from "./choice-text";
import { CHECKBOX_BOX, CHOICE_ROW } from "./styles";
import { CHECK_ICON_SIZE, CHOICE_ROW_SIZE, ChoiceSizeContext, INDICATOR_SIZE, useChoiceSize, type ChoiceSize } from "./choice-size";

export type CheckboxProps = {
  /** `small`, `medium` (default) or `large`; a group's size, then the provider default, otherwise. */
  size?: ChoiceSize;
  /** The option, written positively ("Send notifications"). */
  children: React.ReactNode;
  isSelected?: boolean;
  defaultSelected?: boolean;
  /** A parent of a partially selected list; shows a minus, never a check. */
  isIndeterminate?: boolean;
  onChange?: (isSelected: boolean) => void;
  description?: React.ReactNode;
  isInvalid?: boolean;
  /** Shown under the label while the checkbox is invalid (`isInvalid` or failed native validation). */
  errorMessage?: React.ReactNode;
  isDisabled?: boolean;
  /** The box must be checked (terms to accept); inside a CheckboxGroup the group's `isRequired` applies instead. */
  isRequired?: boolean;
  /**
   * Who says a required box left unchecked is missing: `field` (default) shows "Fill in this field."
   * on blur and on a DS Form submit, which it then blocks; `app` only marks it. See {@link RequiredValidation}.
   * The app's `isInvalid` (`true` with its `errorMessage`, or `false`) overrides the check, as on TextField. Disabled,
   * empty and required, it still blocks a DS Form's submit and cannot take focus (as TextField).
   */
  requiredValidation?: RequiredValidation;
  /** `aria` or `native`; unset, it follows the surrounding form, else React Aria's default (`native`). */
  validationBehavior?: "aria" | "native";
  /** The value inside a CheckboxGroup. */
  value?: string;
  name?: string;
};

/** One independent option, applied on submit (use Switch for settings that apply at once). */
export const Checkbox = React.forwardRef<HTMLLabelElement, CheckboxProps>(function Checkbox(
  { children, description, errorMessage: errorMessageProp, isInvalid: isInvalidProp, requiredValidation, size: ownSize, ...rest },
  ref,
) {
  const size = useChoiceSize(ownSize);
  // React Aria never finds an unchecked required box missing under `aria` validation; the DS does.
  // In a CheckboxGroup the group holds the value and its own `isRequired`, so a box there is left to it.
  const inGroup = React.useContext(CheckboxGroupStateContext) != null;
  const [own, setOwn] = React.useState(rest.defaultSelected ?? false);
  const checked = rest.isSelected ?? own;
  const required = useRequiredChoice({
    filled: checked, isRequired: rest.isRequired && !inGroup, requiredValidation, isInvalid: isInvalidProp, errorMessage: errorMessageProp,
    validationBehavior: rest.validationBehavior, onBlur: (rest as { onBlur?: (event: React.FocusEvent) => void }).onBlur,
  });
  const errorMessage = required.errorMessage;
  // The live region stays mounted while the DS required message can appear, so it appears inside the same node.
  const text = useChoiceText(description, errorMessage, required.checksRequired);
  return (
    <AriaCheckbox
      {...rest}
      ref={ref}
      isInvalid={required.isInvalid}
      onBlur={required.onBlur}
      onChange={(next) => {
        setOwn(next);
        rest.onChange?.(next);
      }}
      aria-labelledby={text.labelId}
      aria-describedby={text.describedBy}
      data-slot="checkbox"
      className={cn(CHOICE_ROW, CHOICE_ROW_SIZE[size])}
    >
      {({ isIndeterminate, isSelected, isInvalid: invalid }) => (
        <>
          <span aria-hidden="true" data-slot="checkbox-box" className={cn(CHECKBOX_BOX, INDICATOR_SIZE[size])}>
            {isIndeterminate ? (
              <IconGlyph name="minus" size="small" strokeWidth={3} data-slot="checkbox-minus" className={CHECK_ICON_SIZE[size] || undefined} />
            ) : isSelected ? (
              <IconGlyph name="check" size="small" strokeWidth={3} data-slot="checkbox-check" className={CHECK_ICON_SIZE[size] || undefined} />
            ) : null}
          </span>
          {/* Shown for `isInvalid` and for native validation (isRequired + submit) alike. */}
          {text.render(children, invalid)}
        </>
      )}
    </AriaCheckbox>
  );
});

export type CheckboxGroupProps = Omit<AriaCheckboxGroupProps, "children" | "className" | "style"> & {
  /** The size of every Checkbox in the group. */
  size?: ChoiceSize;
  /** The visible legend, required. */
  label: React.ReactNode;
  description?: React.ReactNode;
  errorMessage?: React.ReactNode;
  orientation?: "vertical" | "horizontal";
  children: React.ReactNode;
  /**
   * Who says a required group with nothing checked is missing: `field` (default) shows
   * "Fill in this field." when focus leaves the group and on a DS Form submit, which it then blocks; `app` only
   * marks the group. See {@link RequiredValidation}.
   * The app's `isInvalid` (`true` with its `errorMessage`, or `false`) overrides the check, as on TextField. Disabled,
   * empty and required, it still blocks a DS Form's submit and cannot take focus (as TextField).
   */
  requiredValidation?: RequiredValidation;
};

/** Several checkboxes under one visible legend. */
export function CheckboxGroup({ label, description, errorMessage: errorMessageProp, orientation = "vertical", children, requiredValidation, size, ...rest }: CheckboxGroupProps) {
  // React Aria never finds a required group with nothing checked missing under `aria` validation; the DS does
  //. The checked values are followed (the app's, or those React Aria reports) without taking control.
  const [own, setOwn] = React.useState<readonly string[]>(rest.value ?? rest.defaultValue ?? []);
  const current = rest.value ?? own;
  const required = useRequiredChoice({
    filled: current.length > 0, isRequired: rest.isRequired, requiredValidation, isInvalid: rest.isInvalid, errorMessage: errorMessageProp,
    validationBehavior: rest.validationBehavior, onBlur: rest.onBlur as ((event: React.FocusEvent) => void) | undefined,
  });
  const errorMessage = required.errorMessage;
  return (
    <AriaCheckboxGroup
      {...rest}
      isInvalid={required.isInvalid}
      onBlur={required.onBlur as AriaCheckboxGroupProps["onBlur"]}
      onChange={(next) => {
        setOwn(next);
        rest.onChange?.(next);
      }}
      data-slot="checkbox-group"
      className={FIELD_STACK}
    >
      <FieldLabel isRequired={rest.isRequired}>{label}</FieldLabel>
      <div
        data-slot="checkbox-group-items"
        data-orientation={orientation}
        className={cn("flex gap-ds-100", orientation === "vertical" ? "flex-col items-start" : "flex-wrap gap-x-ds-300")}
      >
        <ChoiceSizeContext.Provider value={size}>{children}</ChoiceSizeContext.Provider>
      </div>
      {description && <FieldDescription>{description}</FieldDescription>}
      <FieldError>{errorMessage}</FieldError>
    </AriaCheckboxGroup>
  );
}
