"use client";

import * as React from "react";
import {
  Button as AriaButton,
  I18nProvider,
  Input,
  NumberField as AriaNumberField,
  useLocale,
  type NumberFieldProps as AriaNumberFieldProps,
} from "react-aria-components";
import { IconGlyph } from "../display/icon";

import { cn } from "../utils";
import { useFieldSize } from "../defaults";
import { decreaseLabel, increaseLabel } from "../i18n";
import { FieldDescription, FieldError, FieldLabel } from "./field-parts";
import { InputAddon, InputGroup } from "./input-group";
import { FIELD_STACK, INPUT, type FieldSize } from "./styles";
import { useFieldValidation, type RequiredValidation } from "./validation";
import { splitDataAttributes } from "./data-attributes";

export type NumberFieldProps = Omit<AriaNumberFieldProps, "className" | "style" | "children"> & {
  label: React.ReactNode;
  description?: React.ReactNode;
  /** State the range here too, not only in the error ("1–50"). */
  errorMessage?: React.ReactNode;
  isOptional?: boolean;
  placeholder?: string;
  /** A unit or currency addon when `formatOptions` does not print it ("km", "days"). */
  /** Before the value, inside the frame: text, a unit or currency ("€", "https://"), or `<Icon name="search" />`. */
  leading?: React.ReactNode;
  /** After the value, inside the frame: a unit ("kg"), a domain, an icon. */
  trailing?: React.ReactNode;
  /** The stepper on the end, for small integers. */
  showStepper?: boolean;
  /**
   * Money: an ISO 4217 code ("EUR"). The symbol becomes a leading addon and the
   * amount keeps two decimals, which reads as the design's "€ 248,00" (symbol
   * first, with a space); Intl's own currency style has no space in tr / me.
   */
  currency?: string;
  /** Formats and parses in this locale instead of the provider's (the branch locale). */
  locale?: string;
  size?: FieldSize;
  /**
   * Who says an empty required field is missing: `field` (default) or `app`. With `app` a DS
   * Form's `onSubmit` runs with the field empty, and the app's own error must clear on change. See
   * {@link RequiredValidation} for the whole contract.
   */
  requiredValidation?: RequiredValidation;
};

/**
 * How the locale writes a currency: its narrow symbol, which side of the
 * amount it goes on ("€ 248,00" in tr, "248,00 €" in de) and how many
 * decimals the currency has (2 for EUR, 0 for JPY).
 */
export function currencyLayout(locale: string, currency: string) {
  const format = new Intl.NumberFormat(locale, { style: "currency", currency, currencyDisplay: "narrowSymbol" });
  const parts = format.formatToParts(1);
  const symbolAt = parts.findIndex((part) => part.type === "currency");
  const numberAt = parts.findIndex((part) => part.type === "integer");
  const { maximumFractionDigits = 2 } = format.resolvedOptions();
  return {
    symbol: parts[symbolAt]?.value ?? currency,
    position: symbolAt > numberAt ? ("end" as const) : ("start" as const),
    fractionDigits: maximumFractionDigits,
  };
}

function Stepper() {
  const { locale } = useLocale();
  const cell =
    "inline-flex h-1/2 w-8 items-center justify-center text-ds-icon-subtle outline-hidden cursor-pointer " +
    "data-[hovered]:bg-ds-background-neutral-subtle-hovered data-[pressed]:bg-ds-background-neutral-pressed " +
    "data-[disabled]:cursor-not-allowed data-[disabled]:text-ds-text-disabled";
  return (
    <span data-slot="number-field-stepper" className="-me-(--field-pad) flex flex-col self-stretch border-s border-ds-border">
      <AriaButton slot="increment" aria-label={increaseLabel(locale)} className={cn(cell, "rounded-se-ds-medium border-b border-ds-border")}>
        <IconGlyph name="chevron-up" size="small" data-slot="number-field-stepper-icon" />
      </AriaButton>
      <AriaButton slot="decrement" aria-label={decreaseLabel(locale)} className={cn(cell, "rounded-ee-ds-medium")}>
        <IconGlyph name="chevron-down" size="small" data-slot="number-field-stepper-icon" />
      </AriaButton>
    </span>
  );
}

/**
 * Counts, money and percentages, formatted to the locale while typing.
 * `value` is a number, never a formatted string; money uses `currency` (symbol
 * on the side the locale puts it, the currency's own decimals), and
 * `formatOptions` takes other Intl options (percent, unit). React Aria parses the locale's own
 * separators: only the decimal separator starts a fraction, the grouping
 * separator stays grouping. Focusing selects the value, so
 * typing over a default 0 replaces it. A controlled value that
 * changes while the field is focused shows at once.
 */
export const NumberField = React.forwardRef<HTMLInputElement, NumberFieldProps>(function NumberField(
  {
    label, description, errorMessage, isOptional, placeholder, leading: prefix, trailing: suffix, showStepper, locale, size: fieldSize,
    currency, formatOptions, validate, onBlur, onChange, requiredValidation, ...rest
  },
  ref,
) {
  const size = useFieldSize(fieldSize);
  const selectedOnFocus = React.useRef(false);
  const timing = useFieldValidation<number>({
    validate,
    value: rest.value,
    initialValue: rest.value ?? rest.defaultValue,
    isRequired: rest.isRequired,
    requiredValidation,
    onBlur: onBlur as ((event: React.FocusEvent) => void) | undefined,
    onChange,
    validationBehavior: rest.validationBehavior,
  });

  const { locale: providerLocale } = useLocale();
  const money = currency ? currencyLayout(locale ?? providerLocale, currency) : undefined;
  // The symbol is an addon, so the number itself is a plain decimal with the currency's decimals.
  const options = money
    ? { ...formatOptions, style: "decimal" as const, currency: undefined, minimumFractionDigits: money.fractionDigits, maximumFractionDigits: money.fractionDigits }
    : formatOptions;
  const lead = prefix ?? (money?.position === "start" ? money.symbol : undefined);
  const trail = suffix ?? (money?.position === "end" ? money.symbol : undefined);

  const { wrapperProps, controlData } = splitDataAttributes(rest);
  const field = (
    <AriaNumberField
      {...wrapperProps}
      formatOptions={options}
      validationBehavior={timing.validationBehavior}
      validate={timing.validate}
      onBlur={timing.onBlur}
      onChange={timing.onChange}
      data-slot="number-field"
      className={FIELD_STACK}
    >
      {({ isInvalid, isDisabled }) => (
        <>
          <FieldLabel isRequired={rest.isRequired} isOptional={isOptional}>
            {label}
            {/* The symbol addon is visual; screen readers get the currency in the name. */}
            {currency && <span className="sr-only"> ({currency})</span>}
          </FieldLabel>
          <InputGroup size={size} isDisabled={isDisabled} isInvalid={isInvalid}>
            {lead !== undefined && (
              <InputAddon position="start">
                <span aria-hidden={money ? true : undefined}>{lead}</span>
              </InputAddon>
            )}
            <Input
              {...controlData}
              ref={ref}
              placeholder={placeholder}
              data-slot="number-field-input"
              className={cn(INPUT, "text-body tabular-nums")}
              onMouseDown={(event) => {
                // Only a click that focuses the field needs its release kept from collapsing the selection.
                selectedOnFocus.current = document.activeElement !== event.currentTarget;
              }}
              onFocus={(event) => event.currentTarget.select()}
              onMouseUp={(event) => {
                // A click focuses then releases; the release would collapse the selection (Safari).
                if (selectedOnFocus.current) event.preventDefault();
                selectedOnFocus.current = false;
              }}
            />
            {trail !== undefined && (
              <InputAddon position="end" flush={!showStepper}>
                <span aria-hidden={money ? true : undefined}>{trail}</span>
              </InputAddon>
            )}
            {showStepper && <Stepper />}
          </InputGroup>
          {description && <FieldDescription>{description}</FieldDescription>}
          <FieldError>{errorMessage}</FieldError>
        </>
      )}
    </AriaNumberField>
  );

  return locale ? <I18nProvider locale={locale}>{field}</I18nProvider> : field;
});
