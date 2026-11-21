"use client";

import * as React from "react";
import {
  Autocomplete,
  Button as AriaButton,
  Dialog,
  DialogTrigger,
  Header,
  Input,
  ListBox,
  ListBoxItem,
  ListBoxSection,
  Popover,
  SearchField as AriaSearchField,
  Text,
  TextField as AriaTextField,
  useLocale,
  type Key,
} from "react-aria-components";
import { IconGlyph } from "../display/icon";
import { IsoChipMark } from "../display/iso-chip";

import { cn } from "../utils";
import { COUNTRIES } from "./countries";
import { internationalPasteDigits, stripTrunkPrefix } from "./phone-paste";
import {
  caretAfterDigits,
  digitCountBefore,
  digitIndexForSeparatorKey,
  digitsOf,
  findCountry,
  localeCountry,
  formatNational,
  parsePhone,
  PHONE_COUNTRIES,
  toE164,
  type PhoneCountry,
} from "./phone";
import { regionNames } from "../intl-locale";
import {
  intlLocale,
  noMatchLabel,
  phoneAllCountriesLabel,
  phoneCountryLabel,
  phoneCountryListLabel,
  phoneCountrySearchLabel,
  phoneSuggestedCountriesLabel,
  phoneTooLongLabel,
  phoneTooShortLabel,
} from "../i18n";
import { Highlight, matchesQuery } from "../selection/match";
import { LISTBOX, OPTION, POPOVER } from "../selection/listbox";
import { FieldDescription, FieldError, FieldLabel, isAriaInvalid, useErrorRowLink, useFieldName } from "./field-parts";
import { InputGroup } from "./input-group";
import { FIELD_ICON, FIELD_SIZE, FIELD_STACK, FIELD_FRAME, INPUT, type FieldSize } from "./styles";
import { splitDataAttributes } from "./data-attributes";
import { FormSubmittedContext, useRequiredChoice, type RequiredValidation } from "./validation";

export type PhoneFieldProps = {
  /**
   * The visible label above the field. Leave it out only where something else names the number: a non-empty `aria-label`, `aria-labelledby`, or a form row's `<label htmlFor={id}>`. Inside
   * the DS `Field`, which gives its control the id, the Field's label is then the field's only label and its name
   * (`aria-labelledby` its `{id}-label`). A development warning says so when nothing names it.
   */
  label?: React.ReactNode;
  /** Names the number where no visible label is shown (a table cell, a context that already says it). */
  "aria-label"?: string;
  /** Ids of the elements that name the number, where no visible label of its own is shown. */
  "aria-labelledby"?: string;
  /** The number in E.164 ("+38267123456"), or "" when empty. Controlled with `onChange`. */
  value?: string;
  defaultValue?: string;
  /**
   * The new E.164 value and the ISO country, together: an empty number still carries the chosen country,
   * so a form can keep both (the old shared field's contract, unchanged).
   */
  onChange?: (value: string, country: string) => void;
  /**
   * Controlled ISO country. Left out, it is read from the value, then `defaultCountry`. A shared calling
   * code reads back as the table's first country for it (+1 → US): pass `country` to keep Canada.
   */
  country?: string;
  /** The country an empty field opens on; by default the locale's region ("de-AT" → AT, "en" → US). */
  defaultCountry?: string;
  /** ISO codes shown first, above "All countries" (the markets this form expects). */
  suggestedCountries?: readonly string[];
  description?: React.ReactNode;
  /** What happened and what to do. Wins over the field's own required and length checks. */
  errorMessage?: React.ReactNode;
  isInvalid?: boolean;
  isRequired?: boolean;
  /**
   * Who says an empty required PhoneField is missing: `field` (default) shows "Fill in this field."
   * on blur and on a DS Form submit, which it then blocks, inside a DS Form of either `validationBehavior`; `app`
   * only marks the field. Outside a DS Form an empty value shows nothing either way. The app's `isInvalid` (or
   * `errorMessage`) wins over this message, and `isInvalid={false}` turns the check off. A disabled, empty, required
   * field still blocks a DS Form's submit and cannot take focus. See {@link RequiredValidation}.
   */
  requiredValidation?: RequiredValidation;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  /** Shows "(optional)" when most of the form is required. */
  isOptional?: boolean;
  /** Submits the E.164 value under this name in a native form. */
  name?: string;
  placeholder?: string;
  autoFocus?: boolean;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  size?: FieldSize;
  /** A pasted international number whose country is not offered; the value stays unchanged. */
  onUnsupportedInternationalPaste?: (pasted: string) => void;
  /**
   * The number input's id: an app's `<label htmlFor>` and a focus-on-error reach the input, the
   * element that takes typing. The shared `Field` hands its control one. Left out, React Aria's own id stays.
   */
  id?: string;
  /** Ids of text outside the field that describes the number (a form row's hint or error), added to its own. */
  "aria-describedby"?: string;
  /**
   * Set by a form row that owns the error text (the shared `Field` hands its control `aria-invalid`): the number is
   * marked invalid for assistive tech and drawn invalid, as with `isInvalid`; the row's message is the one shown,
   * since the field draws an error row only for its own `errorMessage` or length check. This field never uses
   * native validity, so it never blocks a form's submit.
   */
  "aria-invalid"?: boolean | "true" | "false";
  /**
   * The country button's name, from the country's name and its calling code ("Country: Germany, +49" by default, in
   * the provider locale). For an app that words it itself; pass it already localized.
   */
  countryLabel?: (country: string, callingCode: string) => string;
  /** The country list's name ("Country" by default), also its popover's. Already localized. */
  countryListLabel?: string;
  /** The country search box's name ("Search countries" by default). Already localized. */
  countrySearchLabel?: string;
  /** The country list's empty result for the typed search ("No results for “{query}”." by default). */
  countryEmptyMessage?: (query: string) => React.ReactNode;
  /**
   * The name of the country list's first section, the `suggestedCountries` ("Suggested countries" by default), which assistive tech
   * reads as the section's name. Already localized.
   */
  suggestedCountriesLabel?: string;
  /**
   * The header above the rest of the list, shown when `suggestedCountries` are shown above it ("All countries" by
   * default). Already localized.
   */
  allCountriesLabel?: string;
  /**
   * `data-*` attributes: `data-testid` on the field's wrapper, as on TextField; every other one on the
   * number input, where password managers and autofill read theirs (`data-1p-ignore`, `data-lpignore`).
   */
  [data: `data-${string}`]: string | number | boolean | undefined;
};

type CountryOption = { iso: string; dial: string; name: string; english: string };

/** Every country with a calling code, named and sorted in the locale (one formatter for the whole list). */
function useCountryOptions(locale: string): CountryOption[] {
  return React.useMemo(() => {
    const tag = intlLocale(locale);
    const names = regionNames(tag);
    let collator: Intl.Collator;
    try {
      collator = new Intl.Collator(tag);
    } catch {
      collator = new Intl.Collator();
    }
    return COUNTRIES.flatMap((country) => {
      const shape = findCountry(country.code);
      return shape ? [{ iso: country.code, dial: shape.dial, name: names(country.code) ?? country.name, english: country.name }] : [];
    }).sort((a, b) => collator.compare(a.name, b.name));
  }, [locale]);
}

/** The two-letter ISO code as a chip: the design never shows an emoji flag, nor a color alone (display's IsoChip). */
function IsoChip({ iso }: { iso: string }) {
  return <IsoChipMark code={iso} slot="phone-field-iso" />;
}

/** "+382", kept in that order in RTL. */
function CallingCode({ dial }: { dial: string }) {
  return (
    <span dir="ltr" data-slot="phone-field-code" className="tabular-nums text-ds-text-subtle">
      +{dial}
    </span>
  );
}

/** The national number's length, as the error says it: "10" or "8–9". */
const digitsText = (shape: PhoneCountry) => (shape.min === shape.max ? String(shape.min) : `${shape.min}–${shape.max}`);

const COUNTRY_BUTTON =
  "-ms-(--field-pad) flex shrink-0 cursor-pointer items-center gap-ds-075 self-stretch rounded-s-ds-medium border-e border-ds-border px-ds-100 text-body outline-hidden " +
  "data-[hovered]:bg-ds-background-neutral-subtle-hovered data-[pressed]:bg-ds-background-neutral-pressed " +
  "data-[focus-visible]:inset-ring-2 data-[focus-visible]:inset-ring-ds-border-focused " +
  "data-[disabled]:cursor-not-allowed";

/**
 * A phone number as a country picker plus the national number, given to the form as one E.164 value.
 * The country button shows the ISO chip and the calling code; its list is a searchable menu exactly as
 * wide as the whole field (localized name, English name, ISO code or calling code, diacritics folded),
 * suggested countries first. The number groups as it is typed and pasting an international number
 * switches the country. Label, description and error belong to the number input, also inside a
 * Dialog or Drawer; inside the DS `Field`, leave `label` out and the Field's label names it. Typing, pasting and switching the country stop the number at the country's
 * longest length; a number too short is said on blur, with
 * what to do. An over-long number set from outside (a stored one) is kept as it is until it is edited.
 */
export const PhoneField = React.forwardRef<HTMLInputElement, PhoneFieldProps>(function PhoneField(
  {
    label,
    value: valueProp,
    defaultValue,
    onChange,
    country: countryProp,
    defaultCountry: defaultCountryProp,
    suggestedCountries = [],
    description,
    errorMessage,
    isInvalid: isInvalidProp,
    isRequired,
    requiredValidation,
    isDisabled,
    isReadOnly,
    isOptional,
    name,
    placeholder,
    autoFocus,
    onBlur,
    size = "default",
    onUnsupportedInternationalPaste,
    id,
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
    countryLabel: countryLabelProp,
    countryListLabel,
    countrySearchLabel,
    countryEmptyMessage,
    suggestedCountriesLabel,
    allCountriesLabel,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    ...data
  },
  forwardedRef,
) {
  const { wrapperProps: wrapperData, controlData } = splitDataAttributes(data);
  const { locale } = useLocale();
  const defaultCountry = defaultCountryProp ?? localeCountry(locale);
  const options = useCountryOptions(locale);
  const byIso = React.useMemo(() => new Map(options.map((option) => [option.iso, option])), [options]);

  // Value and country: controlled when given, otherwise owned here. The country of a stored number is read from it.
  const [ownValue, setOwnValue] = React.useState(defaultValue ?? "");
  const value = valueProp ?? ownValue;
  const [ownCountry, setOwnCountry] = React.useState(() => parsePhone(valueProp ?? defaultValue ?? "").country?.iso ?? defaultCountry);
  let country = countryProp ?? ownCountry;
  const digits = digitsOf(value);
  const known = findCountry(country);
  // A value set from outside with another country's code moves an uncontrolled picker to it.
  if (countryProp === undefined && value.startsWith("+") && known && !digits.startsWith(known.dial)) {
    const inferred = parsePhone(value).country?.iso;
    if (inferred && inferred !== ownCountry) {
      setOwnCountry(inferred);
      country = inferred;
    }
  }
  const shape = findCountry(country) ?? findCountry(defaultCountry) ?? findCountry(localeCountry(locale)) ?? findCountry("US")!;
  const national = value.startsWith("+") && digits.startsWith(shape.dial) ? digits.slice(shape.dial.length) : digits;
  const display = formatNational(national, shape);
  const countryName = byIso.get(shape.iso)?.name ?? shape.iso;

  // The caret stays after the same digit while spaces come and go.
  const inputRef = React.useRef<HTMLInputElement>(null);
  React.useImperativeHandle(forwardedRef, () => inputRef.current!, []);
  // Named by its own label, or from outside (aria-label, aria-labelledby, a form row's label for its id) with no
  // label of its own: one label and one name either way. With a `label` the DOM is as before.
  const { named, showLabel, externalNameProps } = useFieldName("PhoneField", label, ariaLabel, ariaLabelledBy, id, inputRef);
  const caret = React.useRef<number | null>(null);
  const [revision, setRevision] = React.useState(0);
  React.useLayoutEffect(() => {
    if (caret.current === null || !inputRef.current || document.activeElement !== inputRef.current) return;
    const position = caretAfterDigits(display, caret.current);
    inputRef.current.setSelectionRange(position, position);
    caret.current = null;
  }, [display, revision]);

  // The length check runs on blur, never per keystroke: typing can only clear an error (and a country switch
  // re-words it for the new country), a new one waits for the next blur. A value set from outside (a form
  // reset, a loaded draft) is unchecked again until then. Edits never make a number too long (see `emit`), so
  // "too long" is only ever said of a number set from outside.
  const [checked, setChecked] = React.useState(false);
  const emitted = React.useRef(value);
  React.useEffect(() => {
    if (value !== emitted.current) {
      emitted.current = value;
      setChecked(false);
    }
  }, [value]);
  const check = (nationalDigits: string, of: PhoneCountry) => {
    if (!nationalDigits) return null;
    const name = byIso.get(of.iso)?.name ?? of.iso;
    if (nationalDigits.length < of.min) return phoneTooShortLabel(locale, name, digitsText(of));
    if (nationalDigits.length > of.max) return phoneTooLongLabel(locale, name, digitsText(of));
    return null;
  };

  const emit = (typedNational: string, iso: string, digitPosition: number) => {
    const nextShape = findCountry(iso) ?? shape;
    // A number typed or pasted with the country's trunk prefix ("068 555 444" for Montenegro) loses it, and only
    // that recorded prefix: never for a country with none (Italy's 06 stays) or one not known (./phone-paste). The caret stays after the same digit.
    const unprefixed = stripTrunkPrefix(typedNational, nextShape);
    const removed = typedNational.length - unprefixed.length;
    // Every edit (typing, a paste, a country switch) stops at the country's longest number: the digits past it
    // are dropped as they come, so no "too long" is left for blur.
    const nextNational = unprefixed.slice(0, nextShape.max);
    const next = toE164(nextNational, nextShape);
    caret.current = Math.min(Math.max(0, digitPosition - removed), nextNational.length);
    setRevision((n) => n + 1);
    if (valueProp === undefined) setOwnValue(next);
    if (countryProp === undefined) setOwnCountry(nextShape.iso);
    emitted.current = next;
    // Typing clears a shown error once the number is right; it never raises one before the next blur.
    if (checked && !check(nextNational, nextShape)) setChecked(false);
    onChange?.(next, nextShape.iso);
  };

  // While an input method composes (a CJK or some Android keyboards), the text is left as typed: reformatting it
  // mid-composition would break the composition. When it ends, the composed text is taken as one edit.
  const composing = React.useRef(false);
  const [composed, setComposed] = React.useState<string | null>(null);

  const lengthError = checked ? check(national, shape) : null;
  // React Aria never finds an empty required field missing under `aria` validation (which this field always uses
  // with React Aria); the DS does, as TextField does, inside a DS Form of either behaviour, since the
  // browser never sees this field's required. Outside a DS Form nothing is shown for an empty value, as before.
  // The app's error (`isInvalid`, or an `errorMessage`, which makes this field invalid) owns the field and its
  // message wins; `isInvalid={false}` turns the required check off. A number too short or too long is not empty,
  // so the required and length checks never meet.
  const { inForm } = React.useContext(FormSubmittedContext);
  const required = useRequiredChoice({
    filled: national !== "", isRequired, requiredValidation, isInvalid: isInvalidProp ?? (errorMessage ? true : undefined), errorMessage,
    validationBehavior: inForm ? "aria" : "native",
  });
  const shownError = required.errorMessage ?? lengthError;
  // A Form's server errors for `name` are React Aria's, as in every DS field: shown until the number is
  // edited, shown again by the next submit. Only this field's own reasons force the invalid state.
  const isInvalid = Boolean(isInvalidProp || required.isInvalid || errorMessage || lengthError || isAriaInvalid(ariaInvalid));
  const errorRowLink = useErrorRowLink(isAriaInvalid(ariaInvalid), shownError);

  // The country menu: anchored to the whole field and exactly as wide.
  const frameRef = React.useRef<HTMLDivElement>(null);
  const [isOpen, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const suggested = suggestedCountries.flatMap((iso) => byIso.get(iso) ?? []);
  const rest = options.filter((option) => !suggestedCountries.includes(option.iso));
  const searchText = (option: CountryOption) => [option.name, option.english, option.iso, option.dial, `+${option.dial}`];
  const matches = (option: CountryOption) => matchesQuery(query, ...searchText(option));
  const shownSuggested = suggested.filter(matches);
  const shownRest = rest.filter(matches);
  const choose = (key: Key) => {
    const iso = String(key);
    setOpen(false);
    setQuery("");
    if (iso !== shape.iso) emit(national, iso, national.length);
  };
  const option = (item: CountryOption) => (
    <ListBoxItem key={item.iso} id={item.iso} textValue={item.name} data-slot="phone-field-option" className={OPTION}>
      {({ isSelected }) => (
        <>
          <IsoChip iso={item.iso} />
          <Text slot="label" className="min-w-0 flex-1 truncate">
            <Highlight text={item.name} query={query} />
          </Text>
          <span className="shrink-0 text-body-small text-ds-text-subtlest">
            <CallingCode dial={item.dial} />
          </span>
          {isSelected && <IconGlyph name="check" color="brand" data-slot="phone-field-option-check" />}
        </>
      )}
    </ListBoxItem>
  );
  const sectionHeader = "px-ds-100 pt-ds-100 pb-ds-050 text-body-small font-medium text-ds-text-subtle";

  const countryLabel = countryLabelProp ? countryLabelProp(countryName, `+${shape.dial}`) : phoneCountryLabel(locale, countryName, `+${shape.dial}`);
  const listLabel = countryListLabel ?? phoneCountryListLabel(locale);
  const locked = isDisabled || isReadOnly;

  return (
    <AriaTextField
      {...wrapperData}
      // Only when given, so a field without them renders as before (React Aria's own id, its own description ids).
      {...(id !== undefined ? { id } : null)}
      {...(ariaDescribedBy ? { "aria-describedby": ariaDescribedBy } : null)}
      {...(named !== undefined ? { "aria-label": named } : null)}
      {...(ariaLabelledBy ? { "aria-labelledby": ariaLabelledBy } : null)}
      {...externalNameProps}
      // The error row is linked whenever it shows, also when it comes while the field stays invalid.
      {...errorRowLink}
      value={composed ?? display}
      onChange={(typed) => {
        if (composing.current) {
          setComposed(typed);
          return;
        }
        const position = inputRef.current?.selectionStart ?? typed.length;
        emit(digitsOf(typed), shape.iso, digitCountBefore(typed, position));
      }}
      onBlur={(event) => {
        // Only an error found on blur is shown; a right number leaves nothing for typing to raise later.
        setChecked(Boolean(check(national, shape)));
        required.onBlur?.(event as React.FocusEvent<HTMLInputElement>);
        onBlur?.(event as React.FocusEvent<HTMLInputElement>);
      }}
      isInvalid={isInvalid || undefined}
      name={name}
      isRequired={isRequired}
      isDisabled={isDisabled}
      isReadOnly={isReadOnly}
      autoFocus={autoFocus}
      // React Aria's own check stays out of the way: this field says what is wrong on blur.
      validationBehavior="aria"
      data-slot="phone-field"
      className={FIELD_STACK}
    >
      {showLabel && label != null && (
        <FieldLabel isRequired={isRequired} isOptional={isOptional}>
          {label}
        </FieldLabel>
      )}
      <div ref={frameRef} data-slot="phone-field-frame">
        <InputGroup size={size} isDisabled={isDisabled} isInvalid={isInvalid}>
          {locked ? (
            <span data-slot="phone-field-country" aria-label={countryLabel} role="img" className={cn(COUNTRY_BUTTON, "cursor-default")}>
              <IsoChip iso={shape.iso} />
              <CallingCode dial={shape.dial} />
            </span>
          ) : (
            <DialogTrigger
              isOpen={isOpen}
              onOpenChange={(open) => {
                setOpen(open);
                if (!open) setQuery("");
              }}
            >
              <AriaButton aria-label={countryLabel} data-slot="phone-field-country" className={COUNTRY_BUTTON}>
                <IsoChip iso={shape.iso} />
                <CallingCode dial={shape.dial} />
                <IconGlyph name={isOpen ? "chevron-up" : "chevron-down"} className={FIELD_ICON} />
              </AriaButton>
              <Popover
                triggerRef={frameRef}
                placement="bottom start"
                offset={4}
                data-slot="phone-field-popover"
                className={cn(POPOVER, "w-(--trigger-width) max-h-80")}
              >
                <Dialog aria-label={listLabel} className="flex min-h-0 flex-col outline-hidden">
                  <Autocomplete inputValue={query} onInputChange={setQuery} filter={() => true}>
                    <AriaSearchField autoFocus aria-label={countrySearchLabel ?? phoneCountrySearchLabel(locale)} className="mb-ds-050">
                      <div className={cn(FIELD_FRAME, FIELD_SIZE.compact, "focus-within:border-ds-border-focused")}>
                        <IconGlyph name="search" className={FIELD_ICON} />
                        <Input data-slot="phone-field-search" className={cn(INPUT, "text-body [&::-webkit-search-cancel-button]:hidden")} />
                      </div>
                    </AriaSearchField>
                    <ListBox
                      aria-label={listLabel}
                      selectionMode="single"
                      selectedKeys={[shape.iso]}
                      // Pressing the current country toggles it off: that empty selection means "keep it" and closes,
                      // so confirming the country never leaves the list open.
                      onSelectionChange={(keys) => {
                        const [key] = [...(keys as Set<Key>)];
                        choose(key ?? shape.iso);
                      }}
                      data-slot="phone-field-listbox"
                      className={LISTBOX}
                      renderEmptyState={() => (
                        <div data-slot="phone-field-empty" className="px-ds-100 py-ds-150 text-body-small text-ds-text-subtle">
                          {countryEmptyMessage ? countryEmptyMessage(query) : noMatchLabel(locale, query)}
                        </div>
                      )}
                    >
                      {shownSuggested.length > 0 && (
                        <ListBoxSection aria-label={suggestedCountriesLabel ?? phoneSuggestedCountriesLabel(locale)} data-slot="phone-field-suggested" className="flex flex-col">
                          {shownSuggested.map(option)}
                        </ListBoxSection>
                      )}
                      {shownRest.length > 0 && (
                        <ListBoxSection data-slot="phone-field-all" className="flex flex-col">
                          {shownSuggested.length > 0 && <Header className={sectionHeader}>{allCountriesLabel ?? phoneAllCountriesLabel(locale)}</Header>}
                          {shownRest.map(option)}
                        </ListBoxSection>
                      )}
                    </ListBox>
                  </Autocomplete>
                </Dialog>
              </Popover>
            </DialogTrigger>
          )}
          <Input
            {...controlData}
            ref={inputRef}
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            // Digits and spaces read left to right in every language; the text still sits at the inline start.
            dir="ltr"
            placeholder={placeholder}
            // The field's `name` is for its server errors; the form gets the E.164 value from the hidden input.
            name=""
            data-slot="phone-field-input"
            className={cn(INPUT, "text-body tabular-nums rtl:text-end")}
            onCompositionStart={() => {
              composing.current = true;
            }}
            onCompositionEnd={(event) => {
              composing.current = false;
              setComposed(null);
              const typed = event.currentTarget.value;
              emit(digitsOf(typed), shape.iso, digitCountBefore(typed, event.currentTarget.selectionStart ?? typed.length));
            }}
            onPaste={(event) => {
              if (isReadOnly) return;
              // A plus of any form ("＋" from a Japanese IME) or two zeros of any script start an international number;
              // its digits are digitsOf's, so "²" or "①" never count (./phone-paste).
              const pasted = event.clipboardData.getData("text").trim();
              const pastedDigits = internationalPasteDigits(pasted);
              if (pastedDigits === null) return;
              event.preventDefault();
              // Longest calling code first (+38 is a prefix of +380, +381, +382…); the current country wins a tie (+1).
              // On a shared code (+1 for the US, Canada and the Caribbean) the current country wins, then the phone
              // table (the US for +1), as when a stored number is read back.
              const rank = (iso: string) => {
                const at = PHONE_COUNTRIES.findIndex((item) => item.iso === iso);
                return at < 0 ? PHONE_COUNTRIES.length : at;
              };
              const candidates = options
                .filter((item) => pastedDigits.startsWith(item.dial))
                .sort((a, b) => b.dial.length - a.dial.length || Number(b.iso === shape.iso) - Number(a.iso === shape.iso) || rank(a.iso) - rank(b.iso));
              const matched = candidates[0];
              if (!matched) {
                onUnsupportedInternationalPaste?.(pasted);
                return;
              }
              const next = pastedDigits.slice(matched.dial.length);
              emit(next, matched.iso, next.length);
            }}
            onKeyDown={(event) => {
              // Backspace or Delete beside a group space removes the digit, not just the space.
              if (event.ctrlKey || event.metaKey || event.altKey || event.nativeEvent.isComposing || isReadOnly) return;
              if (event.key !== "Backspace" && event.key !== "Delete") return;
              const start = event.currentTarget.selectionStart ?? 0;
              if (start !== event.currentTarget.selectionEnd) return;
              const index = digitIndexForSeparatorKey(display, start, event.key);
              if (index === null) return;
              event.preventDefault();
              emit(national.slice(0, index) + national.slice(index + 1), shape.iso, index);
            }}
          />
        </InputGroup>
      </div>
      {description && <FieldDescription>{description}</FieldDescription>}
      <FieldError>{shownError}</FieldError>
      {/* Disabled controls stay out of a form submission, as a native disabled input would. */}
      {name && !isDisabled && <input type="hidden" name={name} value={value} data-slot="phone-field-value" />}
    </AriaTextField>
  );
});
