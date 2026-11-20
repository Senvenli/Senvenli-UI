"use client";

import * as React from "react";
import {
  Header,
  ListBox,
  ListBoxItem,
  ListBoxSection,
  Popover,
  Text,
  type Key,
} from "react-aria-components";
import { IconGlyph } from "../display/icon";

import { cn } from "../utils";
import { hasContent } from "./choice-text";

/** One option of a Select or MultiSelect. */
export type SelectItem = {
  id: Key;
  label: string;
  description?: React.ReactNode;
  /** Right-aligned detail ("14 items"). */
  meta?: React.ReactNode;
  /** Options with the same group sit under one overline header, in first-seen order. */
  group?: string;
  isDisabled?: boolean;
  /**
   * A small decorative mark before the label (a country's flag, the app's own node): in the option row, and in
   * MultiSelect's tags. Hidden from assistive technology; the label alone names the option.
   */
  icon?: React.ReactNode;
};

/** The icon slot of an option or tag: no width of its own, centred on the row, never read out. */
export const ITEM_ICON = "inline-flex shrink-0 items-center";

/**
 * Options are 32px on `ds-radius-small`; hover and the keyboard cursor fill
 * `ds-background-neutral-subtle-hovered`, keyboard focus adds the 2px inner
 * border (owner rule), selected fills `ds-background-selected`.
 */
export const OPTION =
  "flex min-h-8 cursor-pointer items-center gap-ds-100 rounded-ds-small px-ds-100 text-body text-ds-text outline-hidden select-none " +
  "data-[hovered]:bg-ds-background-neutral-subtle-hovered data-[focused]:bg-ds-background-neutral-subtle-hovered " +
  "data-[selected]:bg-ds-background-selected data-[selected]:data-[focused]:bg-ds-background-selected-hovered " +
  "data-[focus-visible]:inset-ring-2 data-[focus-visible]:inset-ring-ds-border-focused " +
  "data-[disabled]:cursor-not-allowed data-[disabled]:text-ds-text-disabled";

/**
 * At least as wide as the field. React Aria caps the popover to the space
 * left (also inside a Dialog); the list scrolls inside it, so a footer stays
 * pinned at the bottom.
 */
export const POPOVER =
  "flex min-w-(--trigger-width) flex-col overflow-hidden rounded-ds-xlarge bg-ds-surface-overlay p-ds-050 shadow-ds-overlay outline-hidden";
export const LISTBOX = "flex min-h-0 flex-col overflow-auto outline-hidden";

/** The checkbox look inside a MultiSelect option (16px, 1.5px `ds-border-bold`, gold when selected). */
export const OPTION_BOX =
  "grid size-4 shrink-0 place-items-center rounded-ds-xsmall border-[1.5px] border-ds-border-bold bg-ds-background-input text-ds-text-on-brand";
export const OPTION_BOX_SELECTED = "border-ds-border-selected bg-ds-border-selected";

function groupItems(items: readonly SelectItem[]) {
  const groups: { name: string | undefined; items: SelectItem[] }[] = [];
  for (const item of items) {
    const last = groups.find((group) => group.name === item.group);
    if (last) last.items.push(item);
    else groups.push({ name: item.group, items: [item] });
  }
  return groups;
}

function Option({ item, multiple }: { item: SelectItem; multiple: boolean }) {
  return (
    <ListBoxItem id={item.id} textValue={item.label} isDisabled={item.isDisabled} data-slot="select-option" className={OPTION}>
      {({ isSelected }) => (
        <>
          {multiple && (
            <span aria-hidden="true" data-slot="select-option-box" className={cn(OPTION_BOX, isSelected && OPTION_BOX_SELECTED)}>
              {isSelected && <IconGlyph name="check" size="small" strokeWidth={3} data-slot="select-option-box-check" />}
            </span>
          )}
          {hasContent(item.icon) && (
            <span aria-hidden="true" data-slot="select-option-icon" className={ITEM_ICON}>{item.icon}</span>
          )}
          <span className="flex min-w-0 flex-1 flex-col py-ds-075">
            {/* Named by the label, described by the second line; the meta stays out of the name. */}
            <Text slot="label" data-slot="select-option-label" className="truncate">{item.label}</Text>
            {hasContent(item.description) && (
              <Text slot="description" data-slot="select-option-description" className="text-body-small text-ds-text-subtlest">{item.description}</Text>
            )}
          </span>
          {hasContent(item.meta) && (
            <span data-slot="select-option-meta" className="shrink-0 text-body-small text-ds-text-subtlest tabular-nums">{item.meta}</span>
          )}
          {!multiple && isSelected && <IconGlyph name="check" color="brand" data-slot="select-option-check" />}
        </>
      )}
    </ListBoxItem>
  );
}

/** The popover listbox shared by Select and MultiSelect. */
export function SelectPopover({
  items,
  multiple = false,
  footer,
  triggerRef,
}: {
  items: readonly SelectItem[];
  multiple?: boolean;
  footer?: React.ReactNode;
  /** The element the menu opens under and matches in width (default: the trigger button). */
  triggerRef?: React.RefObject<HTMLElement | null>;
}) {
  const groups = groupItems(items);
  return (
    <Popover data-slot="select-popover" placement="bottom start" offset={4} triggerRef={triggerRef} className={POPOVER}>
      <ListBox data-slot="select-listbox" className={LISTBOX}>
        {groups.map((group, index) =>
          group.name === undefined ? (
            group.items.map((item) => <Option key={String(item.id)} item={item} multiple={multiple} />)
          ) : (
            <ListBoxSection key={`${group.name}-${index}`} data-slot="select-section" className="flex flex-col">
              <Header data-slot="select-section-header" className="px-ds-100 pt-ds-100 pb-ds-050 text-heading-xxsmall text-ds-text-subtle">
                {group.name}
              </Header>
              {group.items.map((item) => <Option key={String(item.id)} item={item} multiple={multiple} />)}
            </ListBoxSection>
          ),
        )}
      </ListBox>
      {footer}
    </Popover>
  );
}
