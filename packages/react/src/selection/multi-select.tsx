"use client";

import * as React from "react";
import {
  Button,
  ButtonContext,
  Select as AriaSelect,
  SelectValue,
  useLocale,
  type Key,
} from "react-aria-components";
import { IconGlyph } from "../display/icon";

import { cn } from "../utils";
import { radiusClass, useRadius } from "../defaults";
import { ControlFieldError, FieldDescription, FieldLabel, forwardedInvalid, useErrorRowLink } from "../form/field-parts";
import { FIELD_ICON, FIELD_STACK } from "../form/styles";
import { useRequiredChoice, type RequiredValidation } from "../form/validation";
import { moreCountLabel, removeItemLabel, selectAllLabel, selectPlaceholder, selectedCountLabel } from "../i18n";
import { hasContent } from "./choice-text";
import { ITEM_ICON, SelectPopover, type SelectItem } from "./listbox";
import { SELECT_TRIGGER, type SelectLabelProps } from "./select";

/**
 * A visible `label` above the field, or an `aria-label` where the context already names it (a table cell, a
 * dialog row headed by its own text): Select's `SelectLabelProps`, here.
 */
export type MultiSelectProps = SelectLabelProps & {
  /**
   * A known list of up to ~15 options; more → a searchable ComboBox with multiple selection. An item's `icon`
   * (a flag) shows before its label in the list and in its tag.
   */
  items: readonly SelectItem[];
  /** Controlled; may start undefined and become set later (never flips control). */
  selectedKeys?: readonly Key[];
  defaultSelectedKeys?: readonly Key[];
  onSelectionChange?: (keys: Key[]) => void;
  /** Tags shown before the rest collapse into "+3". */
  maxVisibleTags?: number;
  /** Adds the "Select all" footer with the selected count. */
  allowsSelectAll?: boolean;
  /** Shown after the tags ("Add location"); defaults to "Select". */
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
   * Who says a required MultiSelect with nothing chosen is missing: `field` (default) shows
   * "Fill in this field." on blur and on a DS Form submit, which it then blocks; `app` only marks the field.
   * See {@link RequiredValidation}.
   * The app's `isInvalid` (`true` with its `errorMessage`, or `false`) overrides the check, as on TextField. Disabled,
   * empty and required, it still blocks a DS Form's submit and cannot take focus (as TextField).
   */
  requiredValidation?: RequiredValidation;
  isDisabled?: boolean;
  name?: string;
};

/** 24px tag on `ds-radius-small`. */
export const TAG =
  "inline-flex h-6 max-w-full items-center gap-ds-050 rounded-ds-small bg-ds-background-neutral ps-ds-100 pe-ds-075 text-body-small text-ds-text";
export const TAG_REMOVE =
  "grid size-4 shrink-0 cursor-pointer place-items-center rounded-ds-xsmall text-ds-icon-subtle outline-hidden " +
  "data-[hovered]:bg-ds-background-neutral-pressed data-[focus-visible]:inset-ring-2 data-[focus-visible]:inset-ring-ds-border-focused";

/**
 * The frame around tags and trigger, drawn like a TextField: hover fill,
 * the 2px focused edge while the trigger has keyboard focus or the menu is
 * open, and the danger edge, which stays red while focused or open (compound
 * variants sort after the single ones). The vertical padding centres a 24px
 * tag row in the 36px control (1px borders).
 */
export const MULTI_FIELD =
  "flex min-h-ds-control w-full flex-wrap items-center gap-ds-050 rounded-ds-medium border border-ds-border-bold bg-ds-background-input py-[5px] ps-ds-100 pe-ds-075 " +
  "transition-colors duration-(--ds-duration-instant) ease-ds-standard hover:bg-ds-background-input-hovered " +
  "has-[[data-slot=multi-select-trigger][data-focus-visible]]:border-ds-border-focused has-[[data-slot=multi-select-trigger][data-focus-visible]]:outline-1 " +
  "has-[[data-slot=multi-select-trigger][data-focus-visible]]:outline-solid has-[[data-slot=multi-select-trigger][data-focus-visible]]:-outline-offset-2 " +
  "has-[[data-slot=multi-select-trigger][data-focus-visible]]:outline-ds-border-focused " +
  "group-data-[open]:border-ds-border-focused group-data-[open]:outline-1 group-data-[open]:outline-solid group-data-[open]:-outline-offset-2 group-data-[open]:outline-ds-border-focused " +
  "group-data-[invalid]:border-ds-border-danger group-data-[invalid]:outline-1 group-data-[invalid]:outline-solid group-data-[invalid]:-outline-offset-2 group-data-[invalid]:outline-ds-border-danger " +
  "group-data-[invalid]:group-data-[open]:border-ds-border-danger group-data-[invalid]:group-data-[open]:outline-ds-border-danger " +
  "group-data-[invalid]:has-[[data-slot=multi-select-trigger][data-focus-visible]]:border-ds-border-danger " +
  "group-data-[invalid]:has-[[data-slot=multi-select-trigger][data-focus-visible]]:outline-ds-border-danger " +
  "data-[disabled]:border-transparent data-[disabled]:bg-ds-background-disabled data-[disabled]:text-ds-text-disabled data-[disabled]:hover:bg-ds-background-disabled";

export const MULTI_FOOTER =
  "-mx-ds-050 -mb-ds-050 mt-ds-050 flex shrink-0 items-center justify-between gap-ds-200 border-t border-ds-border p-ds-050 ps-ds-100";
export const SELECT_ALL =
  "h-ds-control-compact cursor-pointer px-ds-050 text-body-strong text-ds-link outline-hidden underline-offset-3 data-[hovered]:underline " +
  "data-[focus-visible]:underline data-[focus-visible]:decoration-2 data-[focus-visible]:decoration-ds-border-focused";

/** A plain button inside the Select: React Aria would otherwise wire every Button in it as the trigger. */
function OwnButton(props: React.ComponentProps<typeof Button>) {
  return (
    <ButtonContext.Provider value={null}>
      <Button {...props} />
    </ButtonContext.Provider>
  );
}

/**
 * Several values from a known list. Chosen values show as removable tags in
 * the field; the menu stays open while picking (Esc or a click outside
 * closes it); Backspace on the field removes the last visible tag. Named by a
 * visible `label` or, where the context names it, an `aria-label`; an item's
 * `icon` (a country flag) shows before its label in the list and in its tag
 *.
 */
export function MultiSelect({
  label, "aria-label": ariaLabel, items, selectedKeys, defaultSelectedKeys, onSelectionChange, maxVisibleTags, allowsSelectAll, placeholder,
  description, errorMessage: errorMessageProp, "aria-invalid": ariaInvalid, requiredValidation, isInvalid: isInvalidProp, ...rest
}: MultiSelectProps) {
  const frameRadius = useRadius(undefined);
  const { locale } = useLocale();
  // Named as Select is: a non-empty aria-label replaces the visible label; an empty one counts as none.
  const named = ariaLabel ? ariaLabel : undefined;
  const showLabel = named === undefined && (ariaLabel === undefined || label != null);
  const unnamed = named === undefined && label == null && !(rest as { "aria-labelledby"?: string })["aria-labelledby"];
  React.useEffect(() => {
    if (process.env.NODE_ENV !== "production" && unnamed) {
      console.warn("MultiSelect: no accessible name. Give a label, or a non-empty aria-label where the context names the field.");
    }
  }, [unnamed]);
  // The menu opens under the whole field (tags included), not under the trigger at its end.
  const fieldRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  // The last key pressed anywhere, to tell an Esc close from a Tab out of the menu.
  const lastKey = React.useRef<string | null>(null);
  React.useEffect(() => {
    const remember = (event: KeyboardEvent) => {
      lastKey.current = event.key;
    };
    document.addEventListener("keydown", remember, true);
    return () => document.removeEventListener("keydown", remember, true);
  }, []);
  const [own, setOwn] = React.useState<Key[]>([...(selectedKeys ?? defaultSelectedKeys ?? [])]);
  const value = selectedKeys !== undefined ? [...selectedKeys] : own;
  const change = (keys: Key[]) => {
    setOwn(keys);
    onSelectionChange?.(keys);
  };
  // Tags follow the item order, so "the last tag" is the last one in that order.
  const chosen = items.filter((item) => value.includes(item.id));
  const visible = maxVisibleTags === undefined ? chosen : chosen.slice(0, maxVisibleTags);
  const hidden = chosen.length - visible.length;
  const selectable = items.filter((item) => !item.isDisabled).map((item) => item.id);
  // React Aria never finds an empty selection missing under `aria` validation; the DS does.
  const required = useRequiredChoice({
    filled: value.length > 0, isRequired: rest.isRequired, requiredValidation, isInvalid: isInvalidProp, errorMessage: errorMessageProp,
    onBlur: (rest as { onBlur?: (event: React.FocusEvent) => void }).onBlur,
  });
  const errorMessage = required.errorMessage;
  const forwarded = forwardedInvalid(ariaInvalid);
  const errorRowLink = useErrorRowLink(forwarded.invalid, errorMessage);

  /** After a tag goes away, focus the next tag's remove button, else the trigger, never the page. */
  const focusAfterRemove = (index: number) => {
    requestAnimationFrame(() => {
      const buttons = fieldRef.current?.querySelectorAll<HTMLElement>('[data-slot="multi-select-tag-remove"]');
      const next = buttons?.[Math.min(index, (buttons?.length ?? 1) - 1)];
      (next ?? triggerRef.current)?.focus();
    });
  };

  return (
    <AriaSelect
      {...rest}
      {...forwarded.fieldProps}
      {...errorRowLink}
      isInvalid={required.isInvalid}
      onBlur={required.onBlur}
      selectionMode="multiple"
      // The spoken placeholder (hidden SelectValue) matches the visible one.
      placeholder={placeholder ?? selectPlaceholder(locale)}
      value={value}
      // Form reset goes back to the defaults, not to an empty selection.
      defaultValue={[...(defaultSelectedKeys ?? [])]}
      onChange={(keys) => change([...keys])}
      onOpenChange={(open) => {
        if (open) {
          lastKey.current = null;
          return;
        }
        // Esc from the footer button can leave focus on the page; put it back on the field.
        // Tab out of the menu is left alone.
        if (lastKey.current === "Escape") {
          requestAnimationFrame(() => {
            if (document.activeElement === document.body) triggerRef.current?.focus();
          });
        }
      }}
      aria-label={named}
      data-slot="multi-select"
      className={cn("group", FIELD_STACK)}
    >
      {({ isDisabled }) => (
        <>
          {showLabel && <FieldLabel isRequired={rest.isRequired}>{label}</FieldLabel>}
          <div
            ref={fieldRef}
            data-slot="multi-select-field"
            data-disabled={isDisabled || undefined}
            className={cn(MULTI_FIELD, radiusClass(frameRadius))}
          >
            {visible.map((item, index) => (
              <span key={String(item.id)} data-slot="multi-select-tag" className={TAG}>
                {/* One child either way, so the remove button keeps its place (and its server id) without an icon. */}
                {hasContent(item.icon) ? (
                  <>
                    <span aria-hidden="true" data-slot="multi-select-tag-icon" className={ITEM_ICON}>{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </>
                ) : (
                  <span className="truncate">{item.label}</span>
                )}
                {!isDisabled && (
                  <OwnButton
                    aria-label={removeItemLabel(locale, item.label)}
                    data-slot="multi-select-tag-remove"
                    className={TAG_REMOVE}
                    onPress={() => {
                      change(value.filter((key) => key !== item.id));
                      focusAfterRemove(index);
                    }}
                  >
                    <IconGlyph name="x" size="small" data-slot="multi-select-tag-remove-icon" />
                  </OwnButton>
                )}
              </span>
            ))}
            {hidden > 0 && (
              <span data-slot="multi-select-more" className={cn(TAG, "pe-ds-100 tabular-nums")}>
                <span aria-hidden="true">+{hidden}</span>
                <span className="sr-only">{moreCountLabel(locale, hidden)}</span>
              </span>
            )}
            <Button
              ref={triggerRef}
              data-slot="multi-select-trigger"
              onKeyDown={(event) => {
                // The last tag the user can see; with "+N" shown, that is the last visible one.
                const last = visible.at(-1);
                if (event.key === "Backspace" && last) change(value.filter((key) => key !== last.id));
              }}
              className={cn(
                SELECT_TRIGGER,
                // The frame is drawn by the field around the tags; the trigger only fills the rest of the row.
                "min-h-6 min-w-20 flex-1 border-0 bg-transparent px-ds-050 outline-0 data-[hovered]:bg-transparent",
                "data-[focus-visible]:outline-0 group-data-[open]:outline-0 group-data-[invalid]:outline-0",
              )}
            >
              {/* The trigger's name is the chosen labels (or the placeholder) plus the field label. */}
              <SelectValue data-slot="multi-select-value" className="sr-only">
                {/* Labels only ("A ve B"), never each option's description or meta. */}
                {({ selectedText, defaultChildren, isPlaceholder }) => (isPlaceholder ? defaultChildren : selectedText)}
              </SelectValue>
              <span aria-hidden="true" data-slot="multi-select-placeholder" className="min-w-0 flex-1 truncate text-ds-text-subtlest">
                {placeholder ?? selectPlaceholder(locale)}
              </span>
              <IconGlyph name="chevron-down" className={FIELD_ICON} data-slot="select-chevron" />
            </Button>
          </div>
          {description && <FieldDescription>{description}</FieldDescription>}
          <ControlFieldError forwardedInvalid={forwarded.invalid}>{errorMessage}</ControlFieldError>
          <SelectPopover
            items={items}
            multiple
            triggerRef={fieldRef}
            footer={
              allowsSelectAll ? (
                <div data-slot="multi-select-footer" className={MULTI_FOOTER}>
                  <OwnButton
                    // Never disabled: a control that disables itself under focus drops focus to the page,
                    // and Esc would no longer close the menu. Pressing it again is a no-op.
                    onPress={() => change([...new Set([...value, ...selectable])])}
                    className={SELECT_ALL}
                  >
                    {selectAllLabel(locale)}
                  </OwnButton>
                  <span data-slot="multi-select-count" className="text-body-small text-ds-text-subtlest tabular-nums">
                    {selectedCountLabel(locale, value.length)}
                  </span>
                </div>
              ) : undefined
            }
          />
        </>
      )}
    </AriaSelect>
  );
}
