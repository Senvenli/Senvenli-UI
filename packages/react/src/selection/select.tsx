"use client";

import * as React from "react";
import {
  Button,
  Select as AriaSelect,
  SelectValue,
  useLocale,
  type Key,
} from "react-aria-components";
import { IconGlyph } from "../display/icon";

import { cn } from "../utils";
import { radiusClass, useRadius, useFieldSize } from "../defaults";
import { ControlFieldError, FieldDescription, FieldLabel, forwardedInvalid, useErrorRowLink } from "../form/field-parts";
import { FIELD_ICON, FIELD_SIZE, FIELD_STACK, type FieldSize } from "../form/styles";
import { useRequiredChoice, type RequiredValidation } from "../form/validation";
import { selectPlaceholder } from "../i18n";
import { ITEM_ICON, SelectPopover, type SelectItem } from "./listbox";

/**
 * The trigger looks like a TextField frame. It is a button, so the field
 * states come from the button and the Select root: keyboard focus or an
 * open menu draw the 2px focused edge (border + 1px inner line), invalid the
 * same in `ds-border-danger`.
 */
export const SELECT_TRIGGER =
  "relative flex w-full cursor-pointer items-center gap-ds-075 rounded-ds-control-medium border border-ds-border-bold bg-ds-background-input text-start text-body text-ds-text outline-hidden " +
  "transition-colors duration-(--ds-duration-instant) ease-ds-standard " +
  "data-[hovered]:bg-ds-background-input-hovered " +
  "data-[focus-visible]:border-ds-border-focused data-[focus-visible]:outline-1 data-[focus-visible]:outline-solid data-[focus-visible]:-outline-offset-2 data-[focus-visible]:outline-ds-border-focused " +
  "group-data-[open]:border-ds-border-focused group-data-[open]:outline-1 group-data-[open]:outline-solid group-data-[open]:-outline-offset-2 group-data-[open]:outline-ds-border-focused " +
  "group-data-[invalid]:border-ds-border-danger group-data-[invalid]:outline-1 group-data-[invalid]:outline-solid group-data-[invalid]:-outline-offset-2 group-data-[invalid]:outline-ds-border-danger " +
  // Invalid stays red while focused or open, as in TextField (compound variants sort after the single ones).
  "group-data-[invalid]:data-[focus-visible]:border-ds-border-danger group-data-[invalid]:data-[focus-visible]:outline-ds-border-danger " +
  "group-data-[invalid]:group-data-[open]:border-ds-border-danger group-data-[invalid]:group-data-[open]:outline-ds-border-danger " +
  "data-[disabled]:cursor-not-allowed data-[disabled]:border-transparent data-[disabled]:bg-ds-background-disabled data-[disabled]:text-ds-text-disabled";

/**
 * A visible `label` above the field, or, where the context already names it
 * (a toolbar filter next to its heading, a table cell), an `aria-label`
 * instead. Exactly one of the two is given.
 */
export type SelectLabelProps =
  | {
      /** The label sits above the field. */
      label: React.ReactNode;
      "aria-label"?: never;
    }
  | {
      label?: never;
      /** Names the field for assistive technology when no visible label is shown. */
      "aria-label": string;
    };

export type SelectProps = SelectLabelProps & {
  /** Up to ~15 options; more, or options people know by name → ComboBox. */
  items: readonly SelectItem[];
  /** Controlled value; `null` is "nothing chosen". It may start undefined and become set later. */
  selectedKey?: Key | null;
  defaultSelectedKey?: Key | null;
  onSelectionChange?: (key: Key | null) => void;
  /** Defaults to "Select" in the provider locale. */
  placeholder?: string;
  description?: React.ReactNode;
  errorMessage?: React.ReactNode;
  isInvalid?: boolean;
  /**
   * Set by a form row that owns the error text (the shared `Field` hands its control `aria-invalid`): the field
   * shows its invalid state as with `isInvalid`, and without an `errorMessage` of its own draws no error row,
   * so the row's message is the only one. The trigger is a button, on which React Aria sets no
   * `aria-invalid`: the forwarded invalid state shows as `data-invalid` on the field (its danger border) and
   * through the row's own error text, not as `aria-invalid` on the trigger. It marks the field invalid for styling and
   * assistive tech only: unlike `isInvalid` it never becomes the field's native validity (React Aria's default
   * outside a DS Form), so it never blocks a form's submit.
   */
  "aria-invalid"?: boolean | "true" | "false";
  isRequired?: boolean;
  /**
   * Who says an empty required Select is missing: `field` (default)
   * shows "Fill in this field." on blur and on a DS Form submit, which it then blocks; `app` only marks the field
   * (`*`, `aria-required`) and the app shows its own error. See {@link RequiredValidation}.
   * The app's `isInvalid` (`true` with its `errorMessage`, or `false`) overrides the check, as on TextField. Disabled,
   * empty and required, it still blocks a DS Form's submit and cannot take focus (as TextField).
   */
  requiredValidation?: RequiredValidation;
  isDisabled?: boolean;
  /** `compact` (32px) for table filters and toolbars. */
  size?: FieldSize;
  name?: string;
  /**
   * Where the field's width comes from when nothing sets it (in a Toolbar, a row of filters). `options` (default):
   * the longest option label (or the placeholder), so the field never jumps as the value changes. `value`: the
   * current value only. In a form the field fills its column either way.
   */
  sizing?: "options" | "value";
};

/**
 * One value from a short list without typing. The menu opens below, at least
 * as wide as the field; arrows move, typing jumps to the first match, Enter
 * selects, Esc closes and returns focus to the field.
 *
 *: the underlying Select is always controlled by this wrapper, so
 * a consumer passing `selectedKey={undefined}` first and a value later never
 * flips React between uncontrolled and controlled.
 */
export const Select = React.forwardRef<HTMLButtonElement, SelectProps>(function Select(
  {
    label, "aria-label": ariaLabel, items, selectedKey, defaultSelectedKey, onSelectionChange, placeholder, description, errorMessage: errorMessageProp,
    size: fieldSize, "aria-invalid": ariaInvalid, requiredValidation, isInvalid: isInvalidProp, sizing = "options", ...rest
  },
  ref,
) {
  const size = useFieldSize(fieldSize);
  const frameRadius = useRadius(undefined);
  const { locale } = useLocale();
  // An empty aria-label names nothing: it is treated as absent (no empty attribute), and a given label shows.
  const named = ariaLabel ? ariaLabel : undefined;
  const showLabel = named === undefined && (ariaLabel === undefined || label != null);
  const unnamed = named === undefined && label == null && !(rest as { "aria-labelledby"?: string })["aria-labelledby"];
  React.useEffect(() => {
    if (process.env.NODE_ENV !== "production" && unnamed) {
      console.warn("Select: no accessible name. Give a label, or a non-empty aria-label where the context names the field.");
    }
  }, [unnamed]);
  const [own, setOwn] = React.useState<Key | null>(selectedKey ?? defaultSelectedKey ?? null);
  // Keep the inner value in step with a controlled one, so dropping back to undefined keeps the last value.
  if (selectedKey !== undefined && selectedKey !== own) setOwn(selectedKey);
  const value = selectedKey !== undefined ? selectedKey : own;
  const selectedIcon = value == null ? undefined : items.find((item) => item.id === value)?.icon;
  // React Aria never finds an empty Select missing under `aria` validation; the DS does.
  const required = useRequiredChoice({
    filled: value !== null, isRequired: rest.isRequired, requiredValidation, isInvalid: isInvalidProp, errorMessage: errorMessageProp,
    onBlur: (rest as { onBlur?: (event: React.FocusEvent) => void }).onBlur,
  });
  const errorMessage = required.errorMessage;
  const forwarded = forwardedInvalid(ariaInvalid);
  const errorRowLink = useErrorRowLink(forwarded.invalid, errorMessage);
  return (
    <AriaSelect
      {...rest}
      {...forwarded.fieldProps}
      {...errorRowLink}
      isInvalid={required.isInvalid}
      onBlur={required.onBlur}
      value={value}
      onChange={(key) => {
        setOwn(key);
        onSelectionChange?.(key);
      }}
      placeholder={placeholder ?? selectPlaceholder(locale)}
      aria-label={named}
      data-slot="select"
      className={cn("group", FIELD_STACK)}
    >
      {showLabel && <FieldLabel isRequired={rest.isRequired}>{label}</FieldLabel>}
      <Button ref={ref} data-slot="select-trigger" className={cn(SELECT_TRIGGER, FIELD_SIZE[size], radiusClass(frameRadius))}>
        {/* The selected option's icon (a flag) before its label, as in the option row; decorative, never read. */}
        {selectedIcon != null && (
          <span aria-hidden data-slot="select-value-icon" className={ITEM_ICON}>
            {selectedIcon}
          </span>
        )}
        {/* Every option label (and the placeholder) sits invisibly in the value's grid cell, so the field is as wide
            as the longest one and keeps that width whatever is picked. Hidden from assistive tech and from view. */}
        <span data-slot="select-value-frame" className="grid min-w-0 flex-1">
          {sizing === "options" &&
            [placeholder ?? selectPlaceholder(locale), ...items.map((item) => item.label)].map((text, index) => (
              <span key={index} aria-hidden data-slot="select-value-sizer" className="invisible col-start-1 row-start-1 h-0 truncate">
                {text}
              </span>
            ))}
          <SelectValue
            data-slot="select-value"
            className="col-start-1 row-start-1 min-w-0 truncate data-[placeholder]:text-ds-text-subtlest"
          >
            {/* The field shows the option's label only, never its description or meta. */}
            {({ selectedText, defaultChildren, isPlaceholder }) => (isPlaceholder ? defaultChildren : selectedText)}
          </SelectValue>
        </span>
        <IconGlyph name="chevron-down" className={FIELD_ICON} data-slot="select-chevron" />
      </Button>
      {description && <FieldDescription>{description}</FieldDescription>}
      <ControlFieldError forwardedInvalid={forwarded.invalid}>{errorMessage}</ControlFieldError>
      <SelectPopover items={items} />
    </AriaSelect>
  );
});
