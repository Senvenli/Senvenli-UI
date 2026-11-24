"use client";

import * as React from "react";
import { Label, ListBox as AriaListBox, ListBoxItem as AriaListBoxItem, type Key, type Selection } from "react-aria-components";

import { cn } from "../utils";
import { IconGlyph, type IconName } from "../display/icon";
import { OPTION } from "./listbox";

export type ListBoxOption = { id: Key; label: string; description?: string; icon?: IconName; isDisabled?: boolean };

export type ListBoxProps = {
  /** The visible name of the list. Leave it out only with an `aria-label`. */
  label?: React.ReactNode;
  "aria-label"?: string;
  items: readonly ListBoxOption[];
  /** `single` (default), `multiple` or `none` (a list of actions with `onAction`). */
  selectionMode?: "none" | "single" | "multiple";
  selectedKeys?: Iterable<Key>;
  defaultSelectedKeys?: Iterable<Key>;
  onSelectionChange?: (keys: Selection) => void;
  /** With `selectionMode="none"`: what pressing an option does. */
  onAction?: (key: Key) => void;
  /** Shown inside the list when it has no options: a sentence or an `EmptyState`. */
  emptyState?: React.ReactNode;
};

/**
 * A list of options shown in place, not in a dropdown: pick one or several, with the keyboard (arrows, typing to
 * jump, Space) or the pointer. For a choice in a dropdown use Select; for rows with actions, List.
 */
export function ListBox({ label, "aria-label": ariaLabel, items, selectionMode = "single", selectedKeys, defaultSelectedKeys, onSelectionChange, onAction, emptyState }: ListBoxProps) {
  const labelId = React.useId();
  return (
    <div data-slot="list-box" className="flex flex-col gap-ds-075">
      {label != null && (
        <Label id={labelId} className="text-body-small font-medium text-ds-text">
          {label}
        </Label>
      )}
      <AriaListBox
        aria-labelledby={label != null ? labelId : undefined}
        aria-label={ariaLabel}
        items={items}
        selectionMode={selectionMode}
        selectedKeys={selectedKeys}
        defaultSelectedKeys={defaultSelectedKeys}
        onSelectionChange={onSelectionChange}
        onAction={onAction}
        disabledKeys={items.filter((item) => item.isDisabled).map((item) => item.id)}
        renderEmptyState={() => <span className="block px-ds-100 py-ds-150 text-body text-ds-text-subtle">{emptyState}</span>}
        data-slot="list-box-list"
        className="flex flex-col gap-ds-025 rounded-ds-large [--ds-surface-radius:calc(var(--ds-radius-large)-1px)] border border-ds-border p-ds-050 outline-hidden data-[focus-visible]:inset-ring-2 data-[focus-visible]:inset-ring-ds-border-focused"
      >
        {(item) => (
          <AriaListBoxItem id={item.id} textValue={item.label} data-slot="list-box-option" className={cn(OPTION, "min-h-9")}>
            {({ isSelected }) => (
              <>
                {item.icon && <IconGlyph name={item.icon} color="subtle" />}
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate">{item.label}</span>
                  {item.description && <span className="truncate text-body-small text-ds-text-subtle">{item.description}</span>}
                </span>
                {isSelected && selectionMode !== "none" && <IconGlyph name="check" data-slot="list-box-check" />}
              </>
            )}
          </AriaListBoxItem>
        )}
      </AriaListBox>
    </div>
  );
}
