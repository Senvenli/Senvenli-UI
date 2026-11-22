"use client";

import * as React from "react";
import {
  Cell as AriaCell,
  Column as AriaColumn,
  Row as AriaRow,
  Table as AriaTable,
  TableBody as AriaTableBody,
  TableHeader as AriaTableHeader,
  TableLayout,
  useLocale,
  Virtualizer,
  type Key,
  type Selection,
  type SortDescriptor,
} from "react-aria-components";

import { cn } from "../utils";
import { IconGlyph } from "../display/icon";
import { selectionLabel } from "../i18n";
import { SelectionCheckbox } from "./selection-checkbox";

export type TableColumn<T> = {
  key: string;
  /** The column's name, a noun ("Total"). */
  header: string;
  /** `end` for numbers and money: right-aligned (start in RTL) in tabular figures. */
  align?: "start" | "end";
  isSortable?: boolean;
  /** A CSS width ("120px", "20%"). Set one to truncate long values in this column. */
  width?: string;
  /** The cell's content; the row's value under `key` by default. */
  render?: (row: T) => React.ReactNode;
  /** Long text: clamp to two lines with an ellipsis, the full text on hover and keyboard focus. */
  wrap?: boolean;
  /** The row header: the value that names the row (an order number); the first column by default. */
  isRowHeader?: boolean;
  /**
   * Hides the column, header and cells, on viewports narrower than this breakpoint (Tailwind's `sm` 640px,
   * `md` 768px, `lg` 1024px, `xl` 1280px): for secondary columns that crowd a narrow screen. The column
   * leaves the table there, so neither the arrow keys nor screen readers reach it. Ignored on the row
   * header column, which names each row (a development warning says so). Sorting by the other columns is
   * unaffected.
   */
  hideBelow?: "sm" | "md" | "lg" | "xl";
};

export type TableProps<T> = {
  /** Names the table ("Orders"). */
  "aria-label": string;
  columns: readonly TableColumn<T>[];
  rows: readonly T[];
  /**
   * The row's stable id; `row.id` by default. Ids must be unique within the table. When the data has no
   * single unique field, build one from the fields that are (`${row.date}:${row.channel}`), or add the row's
   * index as a last resort. A repeated id still renders every row: the first keeps its id and the later ones
   * are keyed `a#2`, `a#3`, … in row order, and selection and `onRowAction` receive those suffixed keys; a
   * development warning names the repeated ids. A suffixed key follows the row's position, not
   * the row: after a sort or filter, a selection made through it can move to another copy of the id.
   */
  rowKey?: (row: T) => Key;
  selectionMode?: "none" | "single" | "multiple";
  selectedKeys?: "all" | Iterable<Key>;
  defaultSelectedKeys?: "all" | Iterable<Key>;
  onSelectionChange?: (keys: Selection) => void;
  sortDescriptor?: SortDescriptor;
  onSortChange?: (descriptor: SortDescriptor) => void;
  /** `compact` (36px rows) for dense working screens; `default` (48px) for public and content pages. */
  density?: "default" | "compact";
  /** One sentence on why it is empty and the action that fills it. */
  renderEmptyState?: () => React.ReactNode;
  /** Opens the record: the whole row is the target. */
  onRowAction?: (key: Key) => void;
  /** A height for the scroll area: the header stays put and gets a shadow once rows scroll under it. */
  maxHeight?: string;
};

const SORT_ICON = { ascending: "arrow-up", descending: "arrow-down" } as const;

/**
 * `hideBelow` as CSS: `display: none` under the breakpoint (written out in full for Tailwind to find). Only
 * for the first paint of a server-rendered table, which has no viewport and renders every column; the
 * client then drops the column itself.
 */
const HIDE_BELOW = { sm: "max-sm:hidden", md: "max-md:hidden", lg: "max-lg:hidden", xl: "max-xl:hidden" } as const;
/** The same breakpoints as media queries: the client leaves a hidden column out of the table's collection. */
const WIDE_ENOUGH = { sm: "(width >= 40rem)", md: "(width >= 48rem)", lg: "(width >= 64rem)", xl: "(width >= 80rem)" } as const;
type Breakpoint = keyof typeof HIDE_BELOW;

/**
 * The breakpoints the viewport is at or above, as a stable string ("sm md"); every one where there is no
 * `matchMedia` (SSR, tests). The server snapshot is every breakpoint, so hydration renders every column,
 * exactly as the server did (no mismatch), with the CSS above hiding the narrow-screen ones; React then
 * re-renders at once with the real viewport and the hidden columns leave the collection. A client-only
 * render reads the viewport on its first render.
 */
function useWideEnough(enabled: boolean) {
  // One MediaQueryList per breakpoint for the table's life, read by every snapshot and subscription.
  const lists = React.useMemo(
    () =>
      enabled && typeof window !== "undefined" && window.matchMedia
        ? (Object.keys(WIDE_ENOUGH) as Breakpoint[]).map((key) => [key, window.matchMedia(WIDE_ENOUGH[key])] as const)
        : null,
    [enabled],
  );
  const subscribe = React.useCallback(
    (onChange: () => void) => {
      lists?.forEach(([, list]) => list.addEventListener("change", onChange));
      return () => lists?.forEach(([, list]) => list.removeEventListener("change", onChange));
    },
    [lists],
  );
  const all = Object.keys(WIDE_ENOUGH).join(" ");
  const snapshot = () => (lists ? lists.filter(([, list]) => list.matches).map(([key]) => key).join(" ") : all);
  return React.useSyncExternalStore(subscribe, snapshot, () => all);
}

/**
 * The rows' keys, unique. React Aria keys a collection by id: a repeated id dropped rows (the
 * walk over the rows follows keys, and the last row with that id ends it early) and, on an update, could loop
 * forever. So the first row with an id keeps it and each later one gets `id#2`, `id#3`, … in row order,
 * skipping any suffix another row already uses as its real id. Ids are compared as strings, as React keys
 * are. Unique ids come back as they are, in the same array order. `repeated` lists each repeated id once.
 * A suffix follows the row's position, not the row: after a sort, filter or page change another copy of the
 * id can hold `id#2`. Each id resumes its own suffix count, so many copies of one id stay linear.
 */
export function uniqueRowKeys(keys: readonly Key[]): { keys: Key[]; repeated: Key[] } {
  const taken = new Set(keys.map(String));
  if (taken.size === keys.length) return { keys: [...keys], repeated: [] };
  // Each id as its first row gives it, by its string form.
  const first = new Map<string, Key>();
  const repeated = new Map<string, Key>();
  // The next suffix to try per id, so the k-th copy does not re-probe the k-1 suffixes before it.
  const next = new Map<string, number>();
  const unique = keys.map((key) => {
    const name = String(key);
    if (!first.has(name)) {
      first.set(name, key);
      return key;
    }
    repeated.set(name, first.get(name)!);
    let count = next.get(name) ?? 2;
    while (taken.has(`${name}#${count}`)) count++;
    next.set(name, count + 1);
    const suffixed = `${name}#${count}`;
    taken.add(suffixed);
    return suffixed;
  });
  return { keys: unique, repeated: [...repeated.values()] };
}

/** A row without an id: no `id` field (`undefined`) or `id: null`. */
const isMissing = (key: Key | null | undefined) => key == null;

/** A repeated id as the warning shows it: JSON for real ids. */
const describeKey = (key: Key) => JSON.stringify(key);

/**
 * Repeated row ids, said once per table and set of ids, in development only. `component` names the caller
 * ("Table", "DataTable"). Rows without an id (no `id` field, or `id: null`, and no `rowKey`) all repeat
 * `undefined` or `null`; the warning says so in those words instead of listing it as an id.
 */
function useRepeatedKeyWarning(component: string, label: string, repeated: readonly Key[]) {
  const signature = repeated.length ? repeated.map((key) => (isMissing(key) ? String(key) : describeKey(key))).join(", ") : "";
  const warned = React.useRef<Set<string> | null>(null);
  React.useEffect(() => {
    if (process.env.NODE_ENV === "production" || !signature) return;
    warned.current ??= new Set();
    if (warned.current.has(signature)) return;
    warned.current.add(signature);
    const missing = repeated.some(isMissing);
    const ids = repeated.filter((key) => !isMissing(key));
    const shown = ids.length > 10 ? `${ids.slice(0, 10).map(describeKey).join(", ")} and ${ids.length - 10} more` : ids.map(describeKey).join(", ");
    const problems = [missing && "rows have no id; pass rowKey", ids.length > 0 && `the row ids ${shown} repeat`].filter(Boolean).join(", and ");
    // Only rows without ids: there is no id to show a suffix of, so the tail says how they are keyed instead,
    // in the keys' literal form: the first `undefined` (or `null`) itself, the later ones the strings
    // "undefined#2", "undefined#3", … by position.
    const positional = repeated
      .filter(isMissing)
      .map((key) => `${String(key)}, "${String(key)}#2", "${String(key)}#3", …`)
      .join(" and ");
    const keyed = ids.length > 0
      ? 'the later rows with a repeated id are keyed "<id>#2", "<id>#3", … in row order'
      : `each row is keyed by its position: ${positional}`;
    console.warn(
      `${component} "${label}": ${problems}. Every row still renders: ${keyed}, and selection and onRowAction receive those keys. Give every row a unique id (rowKey).`,
    );
    // `repeated` is read through `signature`.
  }, [signature, label, component]);
}

/**
 * Records the user scans, compares, sorts and acts on: orders, customers, invoices. On
 * `ds-surface-raised` with a raised shadow; a sunken header row; 48px rows (36px compact) divided by
 * `ds-border`; selection by checkbox with a 2px marker on the leading edge; the row opens the record.
 * Status is a Badge, money right-aligned and formatted by the locale ("$1,248.00"). Under 640px use a List.
 *
 * Pressing a row opens the record while nothing is selected; once rows are ticked a press toggles
 * selection, and a record link in the row-header cell always opens, so a link is never trapped behind selection.
 */
export function Table<T extends object>(props: TableProps<T>) {
  return <TableView {...props} />;
}

/**
 * @internal The Table itself, with one option the public Table does not offer: `virtual` renders only
 * the rows in view (React Aria's Virtualizer). DataTable uses it for long client lists; the table becomes
 * its own scroll area at `height` px, rows and header keep their DS heights and look.
 */
export function TableView<T extends object>({
  "aria-label": label,
  columns: allColumns,
  rows,
  rowKey = (row) => (row as { id: Key }).id,
  selectionMode = "none",
  selectedKeys,
  defaultSelectedKeys,
  onSelectionChange,
  sortDescriptor,
  onSortChange,
  density = "default",
  renderEmptyState,
  onRowAction,
  maxHeight,
  virtual,
  component = "Table",
}: TableProps<T> & {
  virtual?: { height: number };
  /** The component the warnings name: DataTable passes its own. */
  component?: "Table" | "DataTable";
}) {
  const { locale } = useLocale();
  const [scrolled, setScrolled] = React.useState(false);
  const selectable = selectionMode !== "none";
  const multiple = selectionMode === "multiple";
  const rowHeaderKey = (allColumns.find((column) => column.isRowHeader) ?? allColumns[0])?.key;
  // The row header always shows. A column hidden at this viewport is dropped from the collection, so React
  // Aria's keyboard navigation never lands on it (a `display: none` cell would still be in the grid).
  const hideBelow = (column: TableColumn<T>) => (column.key === rowHeaderKey ? undefined : column.hideBelow);
  const ignoredHideBelow = allColumns.find((column) => column.key === rowHeaderKey)?.hideBelow;
  React.useEffect(() => {
    if (process.env.NODE_ENV !== "production" && ignoredHideBelow) {
      console.warn(`Table: hideBelow="${ignoredHideBelow}" is ignored on the row header column "${String(rowHeaderKey)}", which names each row.`);
    }
  }, [ignoredHideBelow, rowHeaderKey]);
  const wide = useWideEnough(allColumns.some((column) => hideBelow(column)));
  const columns = allColumns.filter((column) => {
    const breakpoint = hideBelow(column);
    return !breakpoint || wide.split(" ").includes(breakpoint);
  });
  // A resize that drops the focused cell's column: React Aria's grid state (useGridState) sees the focused
  // key leave the collection and moves focus to the cell now at that index in the same row (the next one
  // toward the end), or to the row itself when the dropped column was the row's end-most; focus never falls
  // to the page (checked in Chromium, LTR and RTL).
  const hiddenClass = (column: TableColumn<T>) => {
    const breakpoint = hideBelow(column);
    return !virtual && breakpoint ? HIDE_BELOW[breakpoint] : undefined;
  };
  const rowHeader = Math.max(0, columns.findIndex((column) => column.isRowHeader));
  const height = density === "compact" ? "h-ds-row-compact" : "h-ds-row";
  // Virtualized, cells are boxes the layout places; they centre their content themselves. Each row sits alone
  // in its own wrapper (so "last row" matches every row) and the header row has no box of its own: the
  // header cells carry the sunken fill and the scroll shadow, and every row keeps its divider.
  const cellBox = virtual ? "flex items-center" : "";
  const headerCell = virtual ? "bg-ds-surface-sunken in-data-[scrolled]:shadow-ds-overflow" : "";
  const lastRow = virtual ? "" : "group-last/row:border-b-0";
  // Every render, not memoized: a rows array changed in place (a row grown, removed or
  // replaced, same reference, same length) must not keep a stale key. It is O(n); unique ids take the fast path
  // (one Set) and come back unchanged.
  const { keys, repeated } = uniqueRowKeys(rows.map(rowKey));
  useRepeatedKeyWarning(component, label, repeated);
  const table = (
      <AriaTable
        aria-label={label}
        selectionMode={selectionMode}
        selectionBehavior="toggle"
        selectedKeys={selectedKeys}
        defaultSelectedKeys={defaultSelectedKeys}
        onSelectionChange={onSelectionChange}
        sortDescriptor={sortDescriptor}
        onSortChange={onSortChange}
        onRowAction={onRowAction}
        onScroll={virtual ? (event: React.UIEvent<HTMLElement>) => setScrolled(event.currentTarget.scrollTop > 0) : undefined}
        style={virtual ? { height: virtual.height, overflow: "auto" } : undefined}
        className={cn("w-full border-separate border-spacing-0 text-body text-ds-text outline-hidden", virtual && "block overscroll-contain")}
      >
        <AriaTableHeader
          data-slot="table-header"
          className={cn(
            "sticky top-0 z-[3] bg-ds-surface-sunken transition-shadow duration-(--ds-duration-fast) motion-reduce:transition-none",
            "in-data-[scrolled]:shadow-ds-overflow",
          )}
        >
          {selectable && (
            <AriaColumn data-slot="table-selection-column" className={cn("w-10 border-b border-ds-border ps-ds-200 text-start", cellBox, headerCell)}>
              {/* Select all only where several can be selected; single selection names the column for screen readers. */}
              {multiple ? <SelectionCheckbox /> : <span className="sr-only">{selectionLabel(locale)}</span>}
            </AriaColumn>
          )}
          {columns.map((column, index) => (
            <AriaColumn
              key={column.key}
              id={column.key}
              isRowHeader={index === rowHeader}
              allowsSorting={column.isSortable}
              data-slot="table-column"
              data-align={column.align ?? "start"}
              data-hide-below={hideBelow(column)}
              style={column.width ? { width: column.width } : undefined}
              className={cn(
                "h-9 whitespace-nowrap border-b border-ds-border px-ds-200 align-middle text-body-small font-medium text-ds-text-subtle outline-hidden",
                "data-[focus-visible]:inset-ring-2 data-[focus-visible]:inset-ring-ds-border-focused",
                column.align === "end" ? "text-end" : "text-start",
                column.isSortable && "cursor-pointer data-[hovered]:text-ds-text",
                cellBox,
                headerCell,
                virtual && column.align === "end" && "justify-end",
                hiddenClass(column),
              )}
            >
              {({ allowsSorting, sortDirection }) => (
                <span className={cn("inline-flex items-center gap-ds-050", column.align === "end" && "flex-row-reverse")}>
                  {column.header}
                  {allowsSorting && (
                    <span data-slot="table-sort-icon" data-direction={sortDirection ?? "none"} className={cn("inline-flex", sortDirection ? "text-ds-text" : "text-ds-text-subtlest")}>
                      <IconGlyph name={sortDirection ? SORT_ICON[sortDirection] : "chevrons-up-down"} size="small" />
                    </span>
                  )}
                </span>
              )}
            </AriaColumn>
          ))}
        </AriaTableHeader>
        <AriaTableBody
          data-slot="table-body"
          items={rows.map((row, index) => ({ key: keys[index], row }))}
          renderEmptyState={
            renderEmptyState
              ? () => (
                  <div data-slot="table-empty" className="px-ds-300 py-ds-500 text-center text-body text-ds-text-subtle">
                    {renderEmptyState()}
                  </div>
                )
              : undefined
          }
        >
          {(item) => (
            <AriaRow
              id={item.key}
              data-slot="table-row"
              className={cn(
                "group/row outline-hidden",
                (onRowAction || selectable) && "cursor-pointer",
                "data-[hovered]:bg-ds-surface-hovered data-[selected]:bg-ds-background-selected",
                "data-[focus-visible]:inset-ring-2 data-[focus-visible]:inset-ring-ds-border-focused",
              )}
            >
              {selectable && (
                <AriaCell data-slot="table-cell" className={cn(height, "relative border-b border-ds-border ps-ds-200 align-middle", lastRow, cellBox)}>
                  <SelectedMarker />
                  <SelectionCheckbox />
                </AriaCell>
              )}
              {columns.map((column, index) => {
                const raw = column.render ? column.render(item.row) : (item.row as Record<string, unknown>)[column.key];
                // Text and numbers are isolated, so a phone or a price keeps its order in RTL ("+1 555 0100").
                const value = typeof raw === "string" || typeof raw === "number" ? <bdi>{raw}</bdi> : raw;
                return (
                  <AriaCell
                    key={column.key}
                    data-slot="table-cell"
                    data-align={column.align ?? "start"}
                    data-hide-below={hideBelow(column)}
                    className={cn(
                      height,
                      "group/cell relative border-b border-ds-border px-ds-200 align-middle outline-hidden",
                      lastRow,
                      "data-[focus-visible]:inset-ring-2 data-[focus-visible]:inset-ring-ds-border-focused",
                      column.align === "end" ? "whitespace-nowrap text-end tabular-nums" : "text-start",
                      cellBox,
                      virtual && column.align === "end" && "justify-end",
                      hiddenClass(column),
                    )}
                  >
                    {!selectable && index === 0 && <SelectedMarker />}
                    {column.wrap ? (
                      <>
                        <span data-slot="table-cell-wrap" title={typeof raw === "string" ? raw : undefined} className="line-clamp-2 py-ds-050">
                          {value as React.ReactNode}
                        </span>
                        {/* The full text floats over the cell on hover and keyboard focus, so the row never changes
                            height; screen readers already read it in full from the clamped text. */}
                        <span
                          aria-hidden
                          inert
                          data-slot="table-cell-full"
                          className="absolute inset-x-0 top-0 z-[2] hidden min-h-full rounded-ds-medium bg-ds-surface-overlay px-ds-200 py-ds-150 text-ds-text shadow-ds-overlay group-hover/cell:block group-data-[focus-visible]/cell:block group-data-[focus-visible]/row:block"
                        >
                          {value as React.ReactNode}
                        </span>
                      </>
                    ) : (
                      (value as React.ReactNode)
                    )}
                  </AriaCell>
                );
              })}
            </AriaRow>
          )}
        </AriaTableBody>
      </AriaTable>
  );
  const rowHeight = density === "compact" ? 36 : 48;
  return (
    <div
      data-slot="table"
      data-density={density}
      data-scrolled={scrolled || undefined}
      data-virtual={virtual ? "" : undefined}
      onScroll={maxHeight && !virtual ? (event) => setScrolled(event.currentTarget.scrollTop > 0) : undefined}
      style={maxHeight && !virtual ? { maxHeight } : undefined}
      className={cn(virtual ? "overflow-hidden" : "overflow-auto", "rounded-ds-large bg-ds-surface-raised shadow-ds-raised", maxHeight && "overscroll-contain")}
    >
      {virtual ? (
        <Virtualizer layout={TableLayout} layoutOptions={{ rowHeight, headingHeight: 36 }}>
          {table}
        </Virtualizer>
      ) : (
        table
      )}
    </div>
  );
}

/** The 2px `ds-border-selected` marker on the row's leading edge, shown while the row is selected. */
function SelectedMarker() {
  return (
    <span
      aria-hidden
      data-slot="table-row-marker"
      className="absolute inset-y-0 start-0 hidden w-0.5 bg-ds-border-selected group-data-[selected]/row:block"
    />
  );
}

