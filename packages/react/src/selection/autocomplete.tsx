"use client";

import * as React from "react";
import {
  ComboBox as AriaComboBox,
  ComboBoxStateContext,
  Group,
  Header,
  Input,
  ListBox,
  ListBoxItem,
  ListBoxSection,
  Popover,
  Text,
  useLocale,
  type Key,
} from "react-aria-components";

import { cn } from "../utils";
import { IconGlyph, type IconName } from "../display/icon";
import { FieldDescription, FieldError, FieldLabel } from "../form/field-parts";
import { FIELD_FRAME, FIELD_ICON, FIELD_SIZE, FIELD_STACK, INPUT, type FieldSize } from "../form/styles";
import { useRequiredChoice, type RequiredValidation } from "../form/validation";
import { loadingLabel } from "../i18n";
import { FieldSpinner } from "./combobox";
import { LISTBOX, OPTION, POPOVER } from "./listbox";
import { Highlight } from "./match";

export type AutocompleteSuggestion = {
  id: Key;
  /** The text a suggestion fills in. */
  label: string;
  /** Detail line ("Main Street 12 · delivery € 15"). */
  description?: string;
  /** Its own icon ("building-2", "plane"); defaults to the field's icon. */
  icon?: IconName;
  /** Suggestions with the same group sit under one header, in the order `groups` gives. */
  group?: string;
};

export type AutocompleteProps = {
  label: React.ReactNode;
  /** The free text; it is a valid value on its own. */
  value: string;
  onChange: (value: string) => void;
  /** Suggestions for the typed text (called after `minLength` characters, debounced). */
  getSuggestions: (text: string, signal: AbortSignal) => Promise<AutocompleteSuggestion[]>;
  /** Called when a suggestion fills the text, with the suggestion itself (coordinates, ids). */
  onSelectSuggestion?: (suggestion: AutocompleteSuggestion) => void;
  /** Group order ("Suggested places" first, then "Addresses"). */
  groups?: readonly string[];
  /** The field's context icon (default `search`). */
  icon?: IconName;
  description?: React.ReactNode;
  errorMessage?: React.ReactNode;
  placeholder?: string;
  isRequired?: boolean;
  /**
   * Who says an empty required Autocomplete is missing: `field` (default) shows "Fill in this field."
   * on blur and on a DS Form submit, which it then blocks; `app` only marks the field. See {@link RequiredValidation}.
   * The app's `isInvalid` (`true` with its `errorMessage`, or `false`) overrides the check, as on TextField. Disabled,
   * empty and required, it still blocks a DS Form's submit and cannot take focus (as TextField).
   */
  requiredValidation?: RequiredValidation;
  isDisabled?: boolean;
  isInvalid?: boolean;
  name?: string;
  /** Characters before suggesting (default 2). */
  minLength?: number;
  /** Debounce in ms (default 250). */
  debounce?: number;
  size?: FieldSize;
};

/** Exposes the combobox state to the selection handler, which runs outside the render tree. */
function StateBridge({ into }: { into: React.MutableRefObject<{ close: () => void } | null> }) {
  into.current = React.useContext(ComboBoxStateContext);
  return null;
}

/** Closes the menu when a finished search found nothing, so an empty box never lingers. */
function CloseWhenEmpty({ count, loading }: { count: number; loading: boolean }) {
  const state = React.useContext(ComboBoxStateContext);
  React.useEffect(() => {
    if (state?.isOpen && count === 0 && !loading) state.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, loading]);
  return null;
}

/**
 * Suggests completions for free text (addresses, places). Unlike
 * ComboBox the typed text is itself the value; a suggestion only fills it.
 * Suggests after 2 characters, debounced 250ms, with a spinner while it loads.
 */
export function Autocomplete({
  label, value, onChange, getSuggestions, onSelectSuggestion, groups, icon = "search", description, errorMessage: errorMessageProp, placeholder,
  minLength = 2, debounce = 250, size = "medium", requiredValidation, isInvalid: isInvalidProp, ...rest
}: AutocompleteProps) {
  const { locale } = useLocale();
  // React Aria has no required check under `aria` validation; the DS does. The typed text is the value.
  const required = useRequiredChoice({
    filled: value.trim() !== "", isRequired: rest.isRequired, requiredValidation, isInvalid: isInvalidProp, errorMessage: errorMessageProp,
  });
  const errorMessage = required.errorMessage;
  const [suggestions, setSuggestions] = React.useState<AutocompleteSuggestion[]>([]);
  const [loading, setLoading] = React.useState(false);
  const fetcher = React.useRef(getSuggestions);
  fetcher.current = getSuggestions;
  // The text a suggestion just filled in: no new search for it, and the menu closes.
  const picked = React.useRef<string | null>(null);
  const state = React.useRef<{ close: () => void } | null>(null);

  React.useEffect(() => {
    const text = value.trim();
    if (picked.current !== null && value === picked.current) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    picked.current = null;
    if (text.length < minLength) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const timer = window.setTimeout(() => {
      fetcher.current(text, controller.signal)
        .then((next) => {
          if (!controller.signal.aborted) setSuggestions(next);
        })
        .catch(() => {
          if (!controller.signal.aborted) setSuggestions([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, debounce);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [value, minLength, debounce]);

  // Listed groups first, in the given order; unlisted groups next; ungrouped suggestions last.
  const order = (name: string | undefined) => {
    if (name === undefined) return Number.MAX_SAFE_INTEGER;
    const at = groups?.indexOf(name) ?? -1;
    return at >= 0 ? at : (groups?.length ?? 0);
  };
  const sections: { name: string | undefined; items: AutocompleteSuggestion[] }[] = [];
  for (const suggestion of suggestions) {
    const section = sections.find((entry) => entry.name === suggestion.group);
    if (section) section.items.push(suggestion);
    else sections.push({ name: suggestion.group, items: [suggestion] });
  }
  sections.sort((a, b) => order(a.name) - order(b.name));

  const pick = (key: Key | null) => {
    const chosen = suggestions.find((suggestion) => suggestion.id === key);
    if (!chosen) return;
    picked.current = chosen.label;
    onChange(chosen.label);
    onSelectSuggestion?.(chosen);
    // Close even when the text did not change (no effect run), after React Aria finishes the press.
    window.setTimeout(() => state.current?.close(), 0);
  };

  const renderItem = (suggestion: AutocompleteSuggestion) => (
    <ListBoxItem
      key={String(suggestion.id)}
      id={suggestion.id}
      textValue={suggestion.label}
      data-slot="autocomplete-option"
      className={OPTION}
    >
      <IconGlyph name={suggestion.icon ?? icon} color="subtle" data-slot="autocomplete-option-icon" />
      <span className="flex min-w-0 flex-1 flex-col py-ds-075">
        <Text slot="label" data-slot="autocomplete-option-label" className="truncate"><Highlight text={suggestion.label} query={value} /></Text>
        {suggestion.description && (
          <Text slot="description" data-slot="autocomplete-option-description" className="truncate text-body-small text-ds-text-subtlest">
            {suggestion.description}
          </Text>
        )}
      </span>
    </ListBoxItem>
  );

  return (
    <AriaComboBox
      {...rest}
      isInvalid={required.isInvalid}
      onBlur={required.onBlur}
      allowsCustomValue
      menuTrigger="input"
      // From the second character the menu opens at once with "Loading…", then fills in.
      allowsEmptyCollection={value.trim().length >= minLength && value !== picked.current}
      inputValue={value}
      onInputChange={onChange}
      selectedKey={null}
      onSelectionChange={(key) => pick(key)}
      data-slot="autocomplete"
      className={cn("group", FIELD_STACK)}
    >
      {({ isInvalid, isDisabled }) => (
        <>
          <FieldLabel isRequired={rest.isRequired}>{label}</FieldLabel>
          <Group data-slot="autocomplete-field" isInvalid={isInvalid} isDisabled={isDisabled} className={cn(FIELD_FRAME, FIELD_SIZE[size])}>
            <IconGlyph name={icon} className={FIELD_ICON} data-slot="field-icon" />
            <Input placeholder={placeholder} data-slot="autocomplete-input" className={cn(INPUT, "text-body")} />
            {loading && <FieldSpinner />}
          </Group>
          {description && <FieldDescription>{description}</FieldDescription>}
          <FieldError>{errorMessage}</FieldError>
          <CloseWhenEmpty count={suggestions.length} loading={loading} />
          <StateBridge into={state} />
          <Popover data-slot="autocomplete-popover" placement="bottom start" offset={4} className={POPOVER}>
            <ListBox
              data-slot="autocomplete-listbox"
              className={LISTBOX}
              dependencies={[value]}
              renderEmptyState={() =>
                loading ? <div data-slot="autocomplete-loading" className="px-ds-100 py-ds-150 text-body-small text-ds-text-subtlest">{loadingLabel(locale)}</div> : null
              }
            >
              {sections.map((section, index) =>
                section.name === undefined ? (
                  section.items.map(renderItem)
                ) : (
                  <ListBoxSection key={`${section.name}-${index}`} data-slot="autocomplete-section" className="flex flex-col">
                    <Header data-slot="autocomplete-section-header" className="px-ds-100 pt-ds-100 pb-ds-050 text-heading-xxsmall text-ds-text-subtle">
                      {section.name}
                    </Header>
                    {section.items.map(renderItem)}
                  </ListBoxSection>
                ),
              )}
            </ListBox>
          </Popover>
        </>
      )}
    </AriaComboBox>
  );
}
