"use client";

import * as React from "react";
import {
  Button as AriaButton,
  Input,
  SearchField as AriaSearchField,
  useLocale,
  type SearchFieldProps as AriaSearchFieldProps,
} from "react-aria-components";
import { IconGlyph } from "../display/icon";

import { cn } from "../utils";
import { useFieldSize } from "../defaults";
import { clearLabel } from "../i18n";
import { FieldLabel } from "./field-parts";
import { InputGroup } from "./input-group";
import { FIELD_ICON, FIELD_STACK, INLINE_ACTION, INPUT, type FieldSize } from "./styles";
import { splitDataAttributes } from "./data-attributes";

export type SearchFieldProps = Omit<AriaSearchFieldProps, "className" | "style" | "children"> & {
  /** Names the field when there is no visible label ("Search"). */
  "aria-label"?: string;
  /** Optional visible label. */
  label?: React.ReactNode;
  /** Lists what can be searched: "Name, email or order number". */
  placeholder?: string;
  /** A key hint shown at rest ("/"); the app binds the key. */
  shortcut?: string;
  size?: FieldSize;
};

/**
 * Filters a list or opens results: a search icon, a clear button once there
 * is text, Esc clears, Enter submits (`onSubmit`). Debounce in the app.
 */
export const SearchField = React.forwardRef<HTMLInputElement, SearchFieldProps>(function SearchField(
  { label, placeholder, shortcut, size: fieldSize, ...rest },
  ref,
) {
  const size = useFieldSize(fieldSize);
  const { locale } = useLocale();
  const { wrapperProps, controlData } = splitDataAttributes(rest);
  return (
    <AriaSearchField {...wrapperProps} data-slot="search-field" className={cn(FIELD_STACK, "group/search")}>
      {({ isEmpty, isDisabled, isInvalid }) => (
        <>
          {label && <FieldLabel>{label}</FieldLabel>}
          <InputGroup size={size} isDisabled={isDisabled} isInvalid={isInvalid}>
            <IconGlyph name="search" data-slot="field-icon" className={FIELD_ICON} />
            <Input
              {...controlData}
              ref={ref}
              placeholder={placeholder}
              data-slot="search-field-input"
              className={cn(INPUT, "text-body [&::-webkit-search-cancel-button]:hidden")}
            />
            {isEmpty && shortcut && (
              <kbd
                aria-hidden="true"
                data-slot="search-field-shortcut"
                className="rounded-ds-small border border-ds-border px-ds-050 font-ds-mono text-body-small text-ds-text-subtlest"
              >
                {shortcut}
              </kbd>
            )}
            {!isEmpty && (
              <AriaButton aria-label={clearLabel(locale)} data-slot="input-action" className={INLINE_ACTION}>
                <IconGlyph name="circle-x" data-slot="search-field-clear-icon" />
              </AriaButton>
            )}
          </InputGroup>
        </>
      )}
    </AriaSearchField>
  );
});
