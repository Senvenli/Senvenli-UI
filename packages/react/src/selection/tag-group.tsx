"use client";

import * as React from "react";
import {
  Button,
  Label,
  Tag,
  TagGroup as AriaTagGroup,
  TagList,
  Text,
  useLocale,
  type Key,
  type Selection,
} from "react-aria-components";

import { cn } from "../utils";
import { IconGlyph, type IconName } from "../display/icon";
import { FieldDescription } from "../form/field-parts";
import { ERROR, FIELD_STACK, LABEL } from "../form/styles";
import { clearAllLabel, removeItemLabel } from "../i18n";

export type TagItem = {
  id: Key;
  label: string;
  /** An optional 12px leading icon ("snowflake" for air conditioning). */
  icon?: IconName;
  isDisabled?: boolean;
};

/**
 * 24px tags on `ds-background-neutral`, `ds-radius-small`, 12px semibold.
 * Selected: `ds-background-selected` with a 1px `ds-border-selected` inset.
 * Keyboard focus: the 2px inner border.
 */
export const TAG_ITEM =
  "inline-flex h-6 max-w-full cursor-default items-center gap-ds-050 rounded-ds-small bg-ds-background-neutral px-ds-100 text-body-small font-medium text-ds-text outline-hidden select-none " +
  "data-[allows-removing]:pe-ds-050 " +
  "data-[selection-mode]:cursor-pointer data-[hovered]:data-[selection-mode]:not-data-[selected]:bg-ds-background-neutral-hovered " +
  "data-[selected]:bg-ds-background-selected data-[selected]:inset-ring-1 data-[selected]:inset-ring-ds-border-selected " +
  // The plain hover fill skips selected tags (not-data-[selected]); a hovered selected tag takes the selected hover fill.
  "data-[selected]:data-[hovered]:bg-ds-background-selected-hovered " +
  "data-[focus-visible]:inset-ring-2 data-[focus-visible]:inset-ring-ds-border-focused " +
  "data-[selected]:data-[focus-visible]:inset-ring-2 data-[selected]:data-[focus-visible]:inset-ring-ds-border-focused " +
  "data-[disabled]:cursor-not-allowed data-[disabled]:text-ds-text-disabled";

export const TAG_REMOVE_BUTTON =
  "grid size-4 shrink-0 cursor-pointer place-items-center rounded-ds-xsmall text-ds-icon-subtle outline-hidden " +
  "data-[hovered]:bg-ds-background-neutral-pressed data-[focus-visible]:inset-ring-2 data-[focus-visible]:inset-ring-ds-border-focused";

function TagRow({ item }: { item: TagItem }) {
  const { locale } = useLocale();
  const removeId = React.useId();
  return (
    <Tag id={item.id} textValue={item.label} data-slot="tag" className={TAG_ITEM}>
      {({ allowsRemoving }) => (
        <>
          {item.icon && <IconGlyph name={item.icon} size="small" data-slot="tag-icon" />}
          <span className="truncate">{item.label}</span>
          {allowsRemoving && (
            // Named by its own label only ("Remove Automatic"); React Aria would add the tag's name again.
            <Button
              slot="remove"
              id={removeId}
              aria-label={removeItemLabel(locale, item.label)}
              aria-labelledby={removeId}
              data-slot="tag-remove"
              className={TAG_REMOVE_BUTTON}
            >
              <IconGlyph name="x" size="small" data-slot="tag-remove-icon" />
            </Button>
          )}
        </>
      )}
    </Tag>
  );
}

export type TagGroupProps = {
  label: React.ReactNode;
  items: readonly TagItem[];
  /** Makes tags removable (active filters); called with the keys removed. */
  onRemove?: (keys: Key[]) => void;
  /** Makes tags selectable (features, filters). */
  selectionMode?: "single" | "multiple";
  selectedKeys?: readonly Key[];
  defaultSelectedKeys?: readonly Key[];
  onSelectionChange?: (keys: Key[]) => void;
  description?: React.ReactNode;
  errorMessage?: React.ReactNode;
  /** What to show when there are no tags ("Filtre yok"). */
  emptyMessage?: React.ReactNode;
};

/**
 * A set of short labels the user can remove or select: active filters,
 * features or filters. Tags are not status (that is a Badge). Removable groups
 * of three or more offer "Clear all".
 */
export function TagGroup({
  label, items, onRemove, selectionMode, selectedKeys, defaultSelectedKeys, onSelectionChange, description, errorMessage, emptyMessage,
}: TagGroupProps) {
  const { locale } = useLocale();
  // Only tags that can go count towards "Clear all" (three or more).
  const removable = items.filter((item) => !item.isDisabled).map((item) => item.id);
  const toKeys = (selection: Selection) => (selection === "all" ? items.map((item) => item.id) : [...selection]);
  return (
    <AriaTagGroup
      data-slot="tag-group"
      className={FIELD_STACK}
      onRemove={onRemove ? (keys) => onRemove([...keys]) : undefined}
      selectionMode={selectionMode ?? "none"}
      selectedKeys={selectedKeys}
      defaultSelectedKeys={defaultSelectedKeys}
      onSelectionChange={onSelectionChange ? (selection) => onSelectionChange(toKeys(selection)) : undefined}
      disabledKeys={items.filter((item) => item.isDisabled).map((item) => item.id)}
    >
      <Label data-slot="tag-group-label" className={LABEL}>{label}</Label>
      <div className="flex flex-wrap items-center gap-ds-075">
        <TagList
          data-slot="tag-list"
          items={items}
          className="flex flex-wrap items-center gap-ds-075 outline-hidden"
          renderEmptyState={emptyMessage ? () => <span className="text-body-small text-ds-text-subtlest">{emptyMessage}</span> : undefined}
        >
          {(item) => <TagRow item={item} />}
        </TagList>
        {onRemove && removable.length >= 3 && (
          <Button
            data-slot="tag-group-clear"
            onPress={() => onRemove(removable)}
            className={cn(
              "h-ds-control-compact cursor-pointer px-ds-050 text-body-strong text-ds-link outline-hidden underline-offset-3 data-[hovered]:underline",
              "data-[focus-visible]:underline data-[focus-visible]:decoration-2 data-[focus-visible]:decoration-ds-border-focused",
            )}
          >
            {clearAllLabel(locale)}
          </Button>
        )}
      </div>
      {description && <FieldDescription>{description}</FieldDescription>}
      {/* TagGroup has no validation of its own; its error is the group's errorMessage slot. */}
      {errorMessage && (
        <Text slot="errorMessage" data-slot="field-error" className={ERROR}>
          <IconGlyph name="circle-alert" data-slot="field-error-icon" />
          <span>{errorMessage}</span>
        </Text>
      )}
    </AriaTagGroup>
  );
}
