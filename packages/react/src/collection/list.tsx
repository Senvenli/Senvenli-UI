"use client";

import * as React from "react";
import {
  GridList as AriaGridList,
  GridListHeader as AriaGridListHeader,
  GridListItem as AriaGridListItem,
  GridListSection as AriaGridListSection,
  type Key,
  type Selection,
} from "react-aria-components";

import { cn } from "../utils";
import { SelectionCheckbox } from "./selection-checkbox";

export type ListItemProps = {
  id: Key;
  /** A visual at the start: an Avatar, an icon or a thumbnail. */
  leading?: React.ReactNode;
  /** The one primary line ("Ada Lovelace"); also the row's text for typeahead. */
  title: string;
  /** The context the reader scans for: item, time, place ("Order 1042 · 10:00 · Berlin"). */
  description?: React.ReactNode;
  /** At the end: a Badge for status, then a subtle icon-button menu. */
  trailing?: React.ReactNode;
  /** Makes the row a link to the record. */
  href?: string;
};

const ROW =
  "group/row relative flex min-h-14 items-center gap-ds-150 border-b border-ds-border px-ds-200 py-ds-100 text-body text-ds-text outline-hidden last:border-b-0 " +
  "data-[hovered]:bg-ds-surface-hovered data-[selected]:bg-ds-background-selected " +
  "data-[focus-visible]:inset-ring-2 data-[focus-visible]:inset-ring-ds-border-focused";

/** One row: leading visual, two lines of text, trailing status and actions. */
export function ListItem({ id, leading, title, description, trailing, href }: ListItemProps) {
  return (
    <AriaGridListItem
      id={id}
      href={href}
      textValue={title}
      data-slot="list-item"
      // React Aria reports hover only on rows that act (open, link or select): those take the pointer.
      className={({ isHovered }) => cn(ROW, isHovered && "cursor-pointer")}
    >
      {({ selectionMode, selectionBehavior }) => (
        <>
          <span
            aria-hidden
            data-slot="list-item-marker"
            className="absolute inset-y-0 start-0 hidden w-0.5 bg-ds-border-selected group-data-[selected]/row:block"
          />
          {/* A checkbox only where rows are picked as a set; a replace list shows its one row by the marker. */}
          {selectionMode !== "none" && selectionBehavior === "toggle" && <SelectionCheckbox />}
          {leading && <span data-slot="list-item-leading" className="flex shrink-0 items-center">{leading}</span>}
          <span className="flex min-w-0 flex-1 flex-col items-start">
            <bdi data-slot="list-item-title" className="max-w-full truncate text-body text-ds-text">{title}</bdi>
            {description && <bdi data-slot="list-item-description" className="max-w-full truncate text-body-small text-ds-text-subtle">{description}</bdi>}
          </span>
          {trailing && <span data-slot="list-item-trailing" className="flex shrink-0 items-center gap-ds-100">{trailing}</span>}
        </>
      )}
    </AriaGridListItem>
  );
}

/** A titled group of rows ("Today"): a small header on `ds-surface-sunken`. */
export function ListSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <AriaGridListSection data-slot="list-section" aria-label={title}>
      <AriaGridListHeader
        data-slot="list-section-header"
        className="border-b border-ds-border bg-ds-surface-sunken px-ds-200 py-ds-075 text-body-small font-medium text-ds-text-subtle"
      >
        {title}
      </AriaGridListHeader>
      {children}
    </AriaGridListSection>
  );
}

export type ListSectionData<T> = { title: string; items: readonly T[] };

export type ListProps<T = never> = {
  /** Names the list ("Today's deliveries"). */
  "aria-label": string;
  /** ListItem rows, or ListSections of them; or give `items` (or `sections`) and `renderItem`. */
  children?: React.ReactNode;
  items?: readonly T[];
  /** Grouped rows under small headers ("Today", "Tomorrow"). */
  sections?: readonly ListSectionData<T>[];
  /** One row's content for `items` / `sections`. */
  renderItem?: (item: T) => ListItemProps;
  selectionMode?: "none" | "single" | "multiple";
  /**
   * How a press selects. `toggle` (default): each row has a checkbox and a press adds or
   * removes it, for picking a set to act on. `replace`: no checkboxes; a press selects that row in place of
   * the last, and with `single` the arrow keys move the selection, for a list that shows one open record
   * beside it (an inbox's conversation). The selected row keeps its marker either way. With `onAction` as
   * well, a press runs the action and selection needs the keyboard (React Aria's replace rule), so a
   * replace list usually leaves `onAction` out.
   */
  selectionBehavior?: "toggle" | "replace";
  selectedKeys?: "all" | Iterable<Key>;
  defaultSelectedKeys?: "all" | Iterable<Key>;
  onSelectionChange?: (keys: Selection) => void;
  /** Opens the row's record. */
  onAction?: (key: Key) => void;
  /** Shown when there are no rows: an `EmptyState` or a sentence. */
  emptyState?: React.ReactNode;
};

/**
 * Records as rows: a leading visual, one primary line and one line of context, trailing status and
 * actions. On `ds-surface-raised` with a raised shadow, 56px minimum rows divided by `ds-border`,
 * sections under small headers. The phone counterpart of Table (use it under 640px) and the default for
 * short feeds.
 */
export function List<T = never>({
  "aria-label": label,
  children,
  items,
  sections,
  renderItem,
  selectionMode = "none",
  selectionBehavior = "toggle",
  selectedKeys,
  defaultSelectedKeys,
  onSelectionChange,
  onAction,
  emptyState,
}: ListProps<T>) {
  const row = (item: T) => {
    const props = renderItem!(item);
    return <ListItem key={props.id} {...props} />;
  };
  const content =
    renderItem && sections
      ? sections.map((section, index) => (
          <ListSection key={`${index}-${section.title}`} title={section.title}>
            {section.items.map(row)}
          </ListSection>
        ))
      : renderItem && items
        ? items.map(row)
        : children;
  return (
    <AriaGridList
      aria-label={label}
      selectionMode={selectionMode}
      selectionBehavior={selectionBehavior}
      selectedKeys={selectedKeys}
      defaultSelectedKeys={defaultSelectedKeys}
      onSelectionChange={onSelectionChange}
      onAction={onAction}
      renderEmptyState={emptyState != null && emptyState !== false ? () => <div className="px-ds-300 py-ds-500 text-center text-body text-ds-text-subtle">{emptyState}</div> : undefined}
      data-slot="list"
      className="flex flex-col overflow-hidden rounded-ds-large bg-ds-surface-raised shadow-ds-raised outline-hidden"
    >
      {content}
    </AriaGridList>
  );
}
