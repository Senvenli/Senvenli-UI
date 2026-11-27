"use client";

import * as React from "react";
import { GridList as AriaGridList, GridListItem as AriaGridListItem, type Key, type Selection } from "react-aria-components";

import { cn } from "../utils";
import { IconGlyph } from "../display/icon";
import { Skeleton } from "../feedback/skeleton";
import { SelectionCheckbox } from "./selection-checkbox";
import type { TableColumn } from "./table";

/** The list row of GridList, so a collapsed table reads as the same list on a phone. */
const CARD =
  "group/row relative flex items-start gap-ds-150 border-b border-ds-border px-ds-200 py-ds-150 text-body text-ds-text outline-hidden last:border-b-0 " +
  "transition-opacity duration-(--ds-duration-fast) in-data-[loading]:opacity-60 motion-reduce:transition-none " +
  "data-[hovered]:bg-ds-surface-hovered data-[selected]:bg-ds-background-selected " +
  "data-[focus-visible]:inset-ring-2 data-[focus-visible]:inset-ring-ds-border-focused";

export type TableCardsProps<T> = {
  "aria-label": string;
  columns: readonly TableColumn<T>[];
  /** The row-header column: the card's title. */
  rowHeaderKey: string | undefined;
  items: readonly { key: Key; row: T }[];
  selectionMode: "none" | "single" | "multiple";
  selectedKeys?: "all" | Iterable<Key>;
  defaultSelectedKeys?: "all" | Iterable<Key>;
  onSelectionChange?: (keys: Selection) => void;
  onRowAction?: (key: Key) => void;
  emptyState?: React.ReactNode;
  isLoading: boolean;
  renderCollapsedRow?: (row: T) => React.ReactNode;
};

const valueOf = <T,>(row: T, column: TableColumn<T>) => (column.render ? column.render(row) : ((row as Record<string, unknown>)[column.key] as React.ReactNode));
const isText = (value: unknown): value is string | number => typeof value === "string" || typeof value === "number";

/**
 * @internal A Table below its `collapseBelow` breakpoint: one card per row in a GridList. The row header is
 * the card's title (with its description); every other column is a label–value line. Selection and
 * `onRowAction` behave as in the table; sorting stays with the app (the cards keep the current order).
 */
export function TableCards<T>({
  "aria-label": label,
  columns,
  rowHeaderKey,
  items,
  selectionMode,
  selectedKeys,
  defaultSelectedKeys,
  onSelectionChange,
  onRowAction,
  emptyState,
  isLoading,
  renderCollapsedRow,
}: TableCardsProps<T>) {
  const header = columns.find((column) => column.key === rowHeaderKey) ?? columns[0];
  const rest = columns.filter((column) => column !== header);
  return (
    <AriaGridList
      aria-label={label}
      items={items}
      selectionMode={selectionMode}
      selectionBehavior="toggle"
      selectedKeys={selectedKeys}
      defaultSelectedKeys={defaultSelectedKeys}
      onSelectionChange={onSelectionChange}
      onAction={onRowAction}
      data-slot="table-cards"
      renderEmptyState={() =>
        isLoading ? (
          <div data-slot="table-cards-loading" aria-hidden className="flex flex-col">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="flex flex-col gap-ds-100 border-b border-ds-border px-ds-200 py-ds-150 last:border-b-0">
                <Skeleton width="56%" height={14} />
                <Skeleton width="80%" height={12} />
                <Skeleton width="64%" height={12} />
              </div>
            ))}
          </div>
        ) : emptyState != null && emptyState !== false ? (
          <div data-slot="table-empty" className="px-ds-300 py-ds-500 text-center text-body text-ds-text-subtle">
            {emptyState}
          </div>
        ) : null
      }
      className="flex flex-col outline-hidden"
    >
      {(item) => {
        const title = header ? valueOf(item.row, header) : null;
        return (
          <AriaGridListItem
            id={item.key}
            textValue={isText(title) ? String(title) : String(item.key)}
            data-slot="table-card"
            className={({ isHovered }) => cn(CARD, isHovered && "cursor-pointer")}
          >
            {({ selectionMode: mode }) => (
              <>
                <span aria-hidden className="absolute inset-y-0 start-0 hidden w-0.5 bg-ds-border-selected group-data-[selected]/row:block" />
                {mode !== "none" && (
                  <span className="flex h-6 shrink-0 items-center">
                    <SelectionCheckbox />
                  </span>
                )}
                <span className="flex min-w-0 flex-1 flex-col gap-ds-075">
                  {renderCollapsedRow ? (
                    renderCollapsedRow(item.row)
                  ) : (
                    <>
                      <span className="flex min-w-0 flex-col">
                        <span data-slot="table-card-title" className="truncate font-medium">
                          {isText(title) ? <bdi>{title}</bdi> : title}
                        </span>
                        {header?.description && (
                          <span data-slot="table-card-description" className="truncate text-body-small text-ds-text-subtle">
                            {header.description(item.row)}
                          </span>
                        )}
                      </span>
                      {rest.length > 0 && (
                        <dl data-slot="table-card-fields" className="m-0 grid grid-cols-[minmax(6rem,auto)_1fr] gap-x-ds-200 gap-y-ds-050 text-body-small">
                          {rest.map((column) => {
                            const value = valueOf(item.row, column);
                            return (
                              <React.Fragment key={column.key}>
                                <dt className="text-ds-text-subtle">{column.header}</dt>
                                <dd className={cn("m-0 min-w-0 text-ds-text", column.align === "end" && "tabular-nums")}>
                                  <span className="block truncate">{isText(value) ? <bdi>{value}</bdi> : value}</span>
                                  {column.description && <span className="block truncate text-ds-text-subtle">{column.description(item.row)}</span>}
                                </dd>
                              </React.Fragment>
                            );
                          })}
                        </dl>
                      )}
                    </>
                  )}
                </span>
                {onRowAction && (
                  <span aria-hidden className="flex h-6 shrink-0 items-center text-ds-icon-subtle rtl:-scale-x-100">
                    <IconGlyph name="chevron-right" size="small" />
                  </span>
                )}
              </>
            )}
          </AriaGridListItem>
        );
      }}
    </AriaGridList>
  );
}
