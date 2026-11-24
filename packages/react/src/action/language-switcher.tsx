"use client";

import * as React from "react";
import {
  Button as AriaButton,
  ListBox,
  ListBoxItem,
  Popover,
  Select as AriaSelect,
  type Key,
} from "react-aria-components";

import { BUTTON_BASE, BUTTON_SIZE, buttonVariantClasses, ICON_ONLY_SIZE } from "./styles";
import { IconGlyph } from "../display/icon";
import { TooltipFor } from "../overlay/floating";
import { LISTBOX, OPTION } from "../selection/listbox";
import { languageLabel } from "../i18n";
import { cn } from "../utils";
import { languageOptions, languageName } from "./language-names";

/**
 * One language as the switcher shows it: the app's mark (a flag, a code chip), if any, and the name in the UI
 * language. With the name hidden (a square trigger) the mark stands alone; the name stays for screen readers.
 * The mark is decorative next to the name, so it is hidden from assistive technology, and the name always tells
 * the options apart.
 */
export function LanguageLabel({
  locale, uiLocale, hideName = false, mark,
}: { locale: string; uiLocale: string; hideName?: boolean; mark?: React.ReactNode }) {
  return (
    <span data-slot="language-label" className="inline-flex min-w-0 items-center gap-ds-075">
      {mark != null && (
        <span data-slot="language-mark" aria-hidden="true" className="inline-flex shrink-0 items-center">
          {mark}
        </span>
      )}
      <span className={hideName ? "sr-only" : "truncate"}>{languageName(locale, uiLocale)}</span>
    </span>
  );
}

export interface LanguageSwitcherProps<Locale extends string> {
  /** Locales to offer, already narrowed to what this product enables. */
  locales: readonly Locale[];
  /** The active UI locale. */
  value: Locale;
  /** Called with the picked locale (routing, persistence). */
  onChange: (locale: Locale) => void;
  /** The trigger's accessible name and tooltip; "Language" (the DS string) by default. */
  label?: string;
  /** Hold the disabled trigger while the product's locale list resolves. */
  isLoading?: boolean;
  /** `button` (default): a trigger in a bar. `sidebar`: a full-width row whose list opens upward, for a panel sidebar. */
  variant?: "button" | "sidebar";
  /** A collapsed rail: the mark alone (or the name, without one), kept for screen readers either way. */
  isCollapsed?: boolean;
  /**
   * A mark before each language's name: a flag, an `IsoChip`, an icon. None by default: a language is not a
   * country, and the name alone tells the options apart.
   */
  renderMark?: (locale: Locale) => React.ReactNode;
  /** Control height: `medium` (default) matches the DS controls, `small` is the compact step. */
  size?: "small" | "medium";
  /**
   * Ids of elements that describe the trigger ("Changes the language of the whole panel"). It lands on the
   * trigger button, the focusable control, also while it is disabled for `isLoading`; left out, nothing is
   * added. While the trigger's tooltip is open it takes the place of the tooltip's id, which only
   * repeats `label`.
   */
  "aria-describedby"?: string;
}

const subscribeToClient = () => () => {};

/**
 * The language choice every surface offers, on the DS.
 *
 * Presentation only: the app resolves the product's locale list and handles
 * `onChange` (routing, persistence). Names come from `Intl.DisplayNames` in
 * the active UI locale (`value`), ordered by that visible name.
 * Choosing a value is a Select, not a Menu, so the list is a listbox whose
 * current option is selected for assistive technology and carries a check.
 *
 * The trigger stays disabled until the component has mounted *and* the
 * caller reports the list resolved, so a product restricted to one language
 * never flashes the full list on a cold cache.
 */
export function LanguageSwitcher<Locale extends string>({
  locales,
  value: current,
  onChange: onSelect,
  label: labelProp,
  isLoading: loading = false,
  variant = "button",
  isCollapsed: collapsed = false,
  size = "medium",
  renderMark,
  "aria-describedby": describedBy,
}: LanguageSwitcherProps<Locale>) {
  const sidebar = variant === "sidebar";
  const label = labelProp ?? languageLabel(current);
  // A collapsed trigger hides the name only behind a mark that is really there.
  const currentMark = renderMark?.(current) ?? null;
  const mounted = React.useSyncExternalStore(subscribeToClient, () => true, () => false);
  const buttonSize = size;
  const square = collapsed && !sidebar;
  const trigger = cn(
    BUTTON_BASE,
    buttonVariantClasses("subtle"),
    BUTTON_SIZE[buttonSize],
    "font-normal",
    square && ICON_ONLY_SIZE[buttonSize],
    sidebar && (collapsed ? "w-full justify-center px-0" : "w-full justify-start"),
  );

  if (!mounted || loading) {
    return (
      <AriaButton data-slot="language-switcher-trigger" aria-label={label} aria-describedby={describedBy} isDisabled className={trigger}>
        <LanguageLabel locale={current} uiLocale={current} hideName={collapsed && currentMark != null} mark={currentMark} />
      </AriaButton>
    );
  }

  const options = languageOptions(locales, current);

  return (
    <AriaSelect
      aria-label={label}
      // React Aria's Select hands it to the trigger button (useSelect → useField → triggerProps), not the wrapper.
      aria-describedby={describedBy}
      value={current as Key}
      onChange={(key) => {
        if (key != null) onSelect(String(key) as Locale);
      }}
      data-slot="language-switcher"
      className={cn(sidebar && "w-full")}
    >
      <TooltipFor content={label} placement="bottom">
        <AriaButton data-slot="language-switcher-trigger" className={trigger}>
          {/* No SelectValue: the trigger is named by the caller's label alone, as before, and shows the current
              language itself (it is always `current`). */}
          <LanguageLabel locale={current} uiLocale={current} hideName={collapsed && currentMark != null} mark={currentMark} />
        </AriaButton>
      </TooltipFor>
      <Popover
        data-slot="language-switcher-popover"
        placement={sidebar ? "top start" : "bottom end"}
        offset={4}
        className="flex min-w-44 flex-col overflow-hidden rounded-ds-large [--ds-surface-radius:var(--ds-radius-large)] bg-ds-surface-overlay p-ds-050 text-ds-text shadow-ds-overlay outline-hidden"
      >
        <ListBox data-slot="language-switcher-list" className={LISTBOX}>
          {options.map((option) => (
            <ListBoxItem
              key={option.locale}
              id={option.locale}
              textValue={option.label}
              data-slot="language-switcher-option"
              className={cn(OPTION, "whitespace-nowrap")}
            >
              {({ isSelected }) => (
                <>
                  {/* The slot holds its width whether or not it is filled, so switching never shifts the rows;
                      the indicator stays at the inline start. */}
                  <span aria-hidden="true" data-slot="language-switcher-check" className="flex size-4 shrink-0 items-center justify-center">
                    {isSelected && <IconGlyph name="check" />}
                  </span>
                  <LanguageLabel locale={option.locale} uiLocale={current} mark={renderMark?.(option.locale)} />
                </>
              )}
            </ListBoxItem>
          ))}
        </ListBox>
      </Popover>
    </AriaSelect>
  );
}
