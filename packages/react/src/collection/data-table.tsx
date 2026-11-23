"use client";

import type { Density } from "../density";
import * as React from "react";
import { useLocale, type Key, type Selection, type SortDescriptor } from "react-aria-components";

import { cn } from "../utils";
import { Button } from "../action/button";
import { EmptyState } from "../feedback/empty-state";
import { Skeleton } from "../feedback/skeleton";
import { SearchField } from "../form/search-field";
import {
  intlLocale,
  retryLabel,
  tableClearFiltersLabel,
  tableColumnsLabel,
  tableEmptyLabel,
  tableLoadFailedHintLabel,
  tableLoadFailedLabel,
  tableNoResultsLabel,
  tableSearchLabel,
  tableSelectedLabel,
  tableToolsLabel,
} from "../i18n";
import { useDesignSystemNavigate } from "../navigate-context";
import { Pagination } from "../navigation/pagination";
import { BulkBar, Toolbar, ToolbarSpacer } from "../layout/toolbar";
import { Menu } from "../overlay/floating";
import { matchesQuery } from "../selection/match";
import { readView, writeView, type DataTableView } from "./data-table-url";
import { TableView, uniqueRowKeys, type TableColumn } from "./table";

export type DataTableColumn<T> = TableColumn<T> & {
  /** Offered in the column picker ("Columns"); the row header column never hides. */
  isHideable?: boolean;
  /** The value sorted and searched in a client list; the row's value under `key` by default. */
  value?: (row: T) => string | number | null | undefined;
};

export type DataTableFilter = {
  /** Also the URL param name. */
  key: string;
  /** "Durum". */
  label: string;
  options: readonly { id: string; label: string }[];
  /** A client list's value(s) for this filter; the row's value under `key` by default (a nested or derived field). */
  value?: (row: never) => string | readonly string[] | null | undefined;
};

export type DataTableQuery = DataTableView & { pageSize: number };

export type DataTableResult<T> = { rows: readonly T[]; total: number };

export type DataTableBulkAction = {
  id: string;
  /** A verb ("Send reminder"). */
  label: string;
  /**
   * Runs on the selected keys (across pages, filtered-out rows included). When it resolves the selection
   * clears and the list reloads; when it rejects both stay, so tell the user why from here (a toast).
   */
  onAction: (keys: Key[]) => unknown;
};

type DataTableBase<T> = {
  /** Names the table ("Orders"). */
  "aria-label": string;
  columns: readonly DataTableColumn<T>[];
  /**
   * The row's stable id; `row.id` by default. Selection is kept by it across pages. Ids must be unique within
   * the list; build one from the fields that are when the data has none (`${row.date}:${row.channel}`). A
   * repeated id on a page still renders every row: the later ones are keyed `a#2`, `a#3`, … in row order, and
   * selection, bulk actions and `onRowAction` receive those suffixed keys; a development warning names the
   * repeated ids. A suffixed key follows the row's position, not the row: after a sort, filter
   * or page change a selection made through it can move to another copy, and an id repeated on two pages is
   * one key, so selecting it on one page selects it on both.
   */
  rowKey?: (row: T) => Key;
  filters?: readonly DataTableFilter[];
  bulkActions?: readonly DataTableBulkAction[];
  defaultSort?: SortDescriptor;
  /** Column key → shown; columns left out are shown. Pass with `onColumnVisibilityChange` to own it. */
  columnVisibility?: Readonly<Record<string, boolean>>;
  onColumnVisibilityChange?: (visibility: Record<string, boolean>) => void;
  /** Opens the record (row press while nothing is selected). */
  onRowAction?: (key: Key) => void;
  /** 20 by default. */
  pageSize?: number;
  /** The range sentence: (41, 60, 1204) → "41–60 of 1,204". */
  formatRange?: (from: number, to: number, total: number) => string;
  /** What an empty list says and the action that fills it (with no search or filter active). */
  emptyState?: { title: string; description?: string; action?: React.ReactNode };
  /** Prefixes the URL params (`orders.page`) when two tables share a page. */
  urlKey?: string;
  /**
   * The URL's search params. Pass them when the page renders on the server (SSR): without them the server
   * reads no params while the browser reads `window.location.search`, and a URL with params hydrates with a
   * mismatch. A host router can also pass its current params here; the view follows when they change.
   */
  searchParams?: URLSearchParams | string;
  /** Passed to the provider's `navigate` with each view change (a host router's replace or scroll option). */
  routerOptions?: unknown;
  /** `compact` (36px rows) by default: DataTable is the dense working list of a back office. */
  density?: Density;
};

export type DataTableProps<T> = DataTableBase<T> &
  (
    | {
        /**
         * A server list: fetches one page for the view; aborted when the view changes again. It is read when
         * the view changes, not when the function does: for a list that depends on something else (a parent
         * tab), give the DataTable a `key` from it so it starts afresh.
         */
        query: (view: DataTableQuery, signal: AbortSignal) => Promise<DataTableResult<T>>;
        rows?: never;
        virtualizeAbove?: never;
        height?: never;
      }
    | {
        /** A client list: searched, filtered and sorted here; paged, or virtualized when long. */
        rows: readonly T[];
        query?: never;
        /** Client lists longer than this render only the rows in view instead of pages. 200 by default. */
        virtualizeAbove?: number;
        /** The virtualized list's height in px. 480 by default. */
        height?: number;
      }
  );

const SEARCH_DEBOUNCE = 300;

/** The row's value for a column, as a client list sorts and searches it. */
function cellValue<T>(row: T, column: DataTableColumn<T>) {
  return column.value ? column.value(row) : ((row as Record<string, unknown>)[column.key] as string | number | null | undefined);
}

/** One empty list for every render, so memos keyed on `filters` hold for tables without filters. */
const NO_FILTERS: readonly DataTableFilter[] = [];

/** One function for every render, so memos keyed on `rowKey` hold. */
const defaultRowKey = (row: object): Key => (row as { id: Key }).id;

function initialParams(searchParams?: URLSearchParams | string) {
  if (searchParams !== undefined) return new URLSearchParams(searchParams);
  return new URLSearchParams(typeof window === "undefined" ? "" : window.location.search);
}

/**
 * The record list of a back office or admin screen: Toolbar (search, filters, column picker), a compact Table
 * with sortable headers and selection, the bulk bar while rows are selected, Pagination, and loading,
 * empty and error states in the table's frame. Page, sort, filters and search live in the URL (through
 * the provider's `navigate`), so a reload or a shared link shows the same view. Server lists page;
 * client lists over 200 rows render only the rows in view. Selection survives paging and clears after a
 * bulk action settles.
 */
export function DataTable<T extends object>(props: DataTableProps<T>) {
  const {
    "aria-label": label,
    columns,
    rowKey = defaultRowKey as (row: T) => Key,
    filters = NO_FILTERS,
    bulkActions = [],
    defaultSort,
    onRowAction,
    pageSize = 20,
    formatRange,
    emptyState,
    urlKey,
    searchParams,
    routerOptions,
    density = "compact",
  } = props;
  const { locale } = useLocale();
  const navigate = useDesignSystemNavigate();
  const filterKeys = React.useMemo(() => filters.map((filter) => filter.key), [filters]);
  const urlOptions = { urlKey, filterKeys, defaultSort };
  // A view from a URL, keeping only filter values the table offers (a stale or hand-edited `?status=foo` is ignored).
  const viewFrom = (params: URLSearchParams): DataTableView => {
    const read = readView(params, urlOptions);
    const known = Object.fromEntries(
      filters.map((filter) => [filter.key, (read.filters[filter.key] ?? []).filter((value) => filter.options.some((option) => option.id === value))]).filter(([, values]) => values.length > 0),
    );
    return { ...read, filters: known };
  };

  // The view: read from the URL, written back on every change, and read again when the URL moves under it
  // (Back and Forward, or a host router handing a new `searchParams`).
  const [view, setViewState] = React.useState<DataTableView>(() => viewFrom(initialParams(searchParams)));
  const writeUrl = (next: DataTableView) => {
    if (!navigate || typeof window === "undefined") return;
    const params = writeView(new URLSearchParams(window.location.search), next, urlOptions).toString();
    const href = `${window.location.pathname}${params ? `?${params}` : ""}${window.location.hash}`;
    if (href !== `${window.location.pathname}${window.location.search}${window.location.hash}`) navigate(href, routerOptions as never);
  };
  const viewRef = React.useRef(view);
  viewRef.current = view;
  const setView = (patch: Partial<DataTableView>) => {
    // Anything but a page change starts again at page 1.
    const next = { ...viewRef.current, ...patch, page: patch.page ?? 1 };
    viewRef.current = next;
    setViewState(next);
    writeUrl(next);
  };
  // The search box answers each keystroke; the view (the fetch and the URL) follows once typing pauses.
  const [searchInput, setSearchInput] = React.useState(view.search);
  const searchTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  React.useEffect(() => () => clearTimeout(searchTimer.current), []);
  const adopt = (next: DataTableView) => {
    if (JSON.stringify(next) === JSON.stringify(viewRef.current)) return;
    clearTimeout(searchTimer.current);
    viewRef.current = next;
    setViewState(next);
    setSearchInput(next.search);
  };
  const adoptRef = React.useRef(adopt);
  adoptRef.current = adopt;
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const onPop = () => adoptRef.current(viewFrom(new URLSearchParams(window.location.search)));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // viewFrom reads the latest props when the event fires through adoptRef's render.
  }, []);
  const paramsKey = searchParams === undefined ? undefined : new URLSearchParams(searchParams).toString();
  const firstParams = React.useRef(paramsKey);
  React.useEffect(() => {
    if (paramsKey === undefined || paramsKey === firstParams.current) return;
    firstParams.current = paramsKey;
    adoptRef.current(viewFrom(new URLSearchParams(paramsKey)));
  }, [paramsKey]);
  const onSearch = (search: string) => {
    setSearchInput(search);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setView({ search }), SEARCH_DEBOUNCE);
  };

  // Columns the picker hides.
  const [ownVisibility, setOwnVisibility] = React.useState<Record<string, boolean>>({});
  const visibility = props.columnVisibility ?? ownVisibility;
  const rowHeaderKey = (columns.find((column) => column.isRowHeader) ?? columns[0])?.key;
  const shownColumns = columns.filter((column) => column.key === rowHeaderKey || visibility[column.key] !== false);
  const hideable = columns.filter((column) => column.isHideable && column.key !== rowHeaderKey);
  const setVisibility = (next: Record<string, boolean>) => {
    if (props.columnVisibility === undefined) setOwnVisibility(next);
    props.onColumnVisibilityChange?.(next);
  };

  // Server data.
  const [reload, setReload] = React.useState(0);
  // `forView` is the view a result answered: a stale result (the moment after Back restores another view)
  // never decides anything about the new one.
  const [server, setServer] = React.useState<{ status: "loading" | "ready" | "error"; result?: DataTableResult<T>; forView?: string }>({ status: "loading" });
  const viewKey = JSON.stringify(view);
  const queryRef = React.useRef(props.query);
  queryRef.current = props.query;
  const isServer = props.query !== undefined;
  React.useEffect(() => {
    if (!isServer) return;
    const controller = new AbortController();
    setServer((previous) => ({ status: "loading", result: previous.result }));
    Promise.resolve(queryRef.current!({ ...view, pageSize }, controller.signal)).then(
      (result) => !controller.signal.aborted && setServer({ status: "ready", result, forView: viewKey }),
      () => !controller.signal.aborted && setServer((previous) => ({ status: "error", result: previous.result })),
    );
    return () => controller.abort();
    // `view` is read through `viewKey`.
  }, [isServer, viewKey, pageSize, reload]);

  // Client data: searched, filtered and sorted here.
  const collator = React.useMemo(() => new Intl.Collator(intlLocale(locale), { numeric: true, sensitivity: "base" }), [locale]);
  const clientRows = React.useMemo(() => {
    if (isServer) return [];
    let rows = [...(props.rows ?? [])];
    if (view.search.trim()) rows = rows.filter((row) => matchesQuery(view.search, ...columns.map((column) => String(cellValue(row, column) ?? ""))));
    for (const [key, values] of Object.entries(view.filters)) {
      if (!values.length) continue;
      const accessor = filters.find((filter) => filter.key === key)?.value as ((row: T) => string | readonly string[] | null | undefined) | undefined;
      rows = rows.filter((row) => {
        const own = accessor ? accessor(row) : ((row as Record<string, unknown>)[key] as string | null | undefined);
        const list = Array.isArray(own) ? own : [own];
        return list.some((item) => item != null && values.includes(String(item)));
      });
    }
    const sortColumn = view.sort && columns.find((column) => column.key === String(view.sort!.column));
    if (sortColumn) {
      const sign = view.sort!.direction === "descending" ? -1 : 1;
      rows.sort((a, b) => {
        const left = cellValue(a, sortColumn);
        const right = cellValue(b, sortColumn);
        if (typeof left === "number" && typeof right === "number") return (left - right) * sign;
        return collator.compare(String(left ?? ""), String(right ?? "")) * sign;
      });
    }
    return rows;
    // `view` is read through `viewKey`.
  }, [isServer, props.rows, viewKey, columns, filters, collator]);
  const virtual = !isServer && clientRows.length > (props.virtualizeAbove ?? 200);
  const total = isServer ? (server.result?.total ?? 0) : clientRows.length;
  // A page past the end (a shared `?page=99`, the last page emptied by a bulk delete) moves to the last page.
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const known = !isServer || (server.status === "ready" && server.forView === viewKey);
  React.useEffect(() => {
    if (known && !virtual && view.page > lastPage) setView({ page: lastPage });
  });
  const pageRows = React.useMemo(
    () => (isServer ? (server.result?.rows ?? []) : virtual ? clientRows : clientRows.slice((view.page - 1) * pageSize, view.page * pageSize)),
    [isServer, server.result, virtual, clientRows, view.page, pageSize],
  );

  // Selection across pages: kept by key, whatever page shows.
  const [selected, setSelected] = React.useState<ReadonlySet<Key>>(new Set());
  // The keys the table gives the rows on this page: a repeated id is suffixed there, so it is here too.
  // Every render, as TableView computes its keys: a row whose id changed in place must not
  // keep a stale key here, or its selection would be filtered out.
  const visibleKeys = new Set(uniqueRowKeys(pageRows.map(rowKey)).keys);
  const onSelectionChange = (keys: Selection) => {
    const next = new Set([...selected].filter((key) => !visibleKeys.has(key)));
    for (const key of keys === "all" ? visibleKeys : keys) if (visibleKeys.has(key)) next.add(key);
    setSelected(next);
  };
  const [pendingAction, setPendingAction] = React.useState<string | null>(null);
  const runBulk = async (action: DataTableBulkAction) => {
    setPendingAction(action.id);
    try {
      await action.onAction([...selected]);
      // Done: the selection goes and the list shows the result.
      setSelected(new Set());
      setReload((n) => n + 1);
    } catch {
      // Failed: the selection and the bar stay so the action can be tried again; the app says what went
      // wrong (its `onAction` toasts the reason), the table never swallows it into an unhandled rejection.
    } finally {
      setPendingAction(null);
    }
  };

  const isFiltered = Boolean(view.search.trim()) || Object.values(view.filters).some((values) => values.length > 0);
  const clearFilters = () => {
    clearTimeout(searchTimer.current);
    setSearchInput("");
    setView({ search: "", filters: {} });
  };
  const status = isServer ? server.status : "ready";
  const showSkeleton = status === "loading" && !(server.result && server.result.rows.length);

  const empty = () =>
    isFiltered ? (
      <EmptyState
        size="small"
        icon="search-x"
        title={tableNoResultsLabel(locale)}
        primaryAction={<Button size="small" onPress={clearFilters}>{tableClearFiltersLabel(locale)}</Button>}
      />
    ) : (
      <EmptyState size="small" icon="inbox" title={emptyState?.title ?? tableEmptyLabel(locale)} description={emptyState?.description} primaryAction={emptyState?.action} />
    );

  return (
    <section data-slot="data-table" aria-busy={status === "loading" || undefined} className="flex min-w-0 flex-col gap-ds-150">
      {selected.size > 0 && bulkActions.length > 0 ? (
        <BulkBar
          aria-label={tableSelectedLabel(locale)}
          selectedCount={selected.size}
          onClear={() => setSelected(new Set())}
          actions={bulkActions.map((action) => (
            <Button key={action.id} size="small" isPending={pendingAction === action.id} isDisabled={pendingAction !== null} onPress={() => void runBulk(action)}>
              {action.label}
            </Button>
          ))}
        />
      ) : (
        <Toolbar aria-label={tableToolsLabel(locale)}>
          <div data-slot="data-table-search" className="w-56 max-w-full">
            <SearchField
              aria-label={tableSearchLabel(locale)}
              placeholder={tableSearchLabel(locale)}
              size="small"
              value={searchInput}
              onChange={onSearch}
            />
          </div>
          {filters.map((filter) => {
            const values = view.filters[filter.key] ?? [];
            return (
              <Menu
                key={filter.key}
                aria-label={filter.label}
                placement="bottom start"
                selectionMode="multiple"
                selectedKeys={values}
                onSelectionChange={(keys) => setView({ filters: { ...view.filters, [filter.key]: keys === "all" ? filter.options.map((option) => option.id) : [...keys].map(String) } })}
                items={filter.options.map((option) => ({ id: option.id, label: option.label }))}
                trigger={
                  <Button size="small" variant={values.length ? "default" : "subtle"} iconBefore="filter">
                    {values.length ? `${filter.label} · ${values.length}` : filter.label}
                  </Button>
                }
              />
            );
          })}
          <ToolbarSpacer />
          {hideable.length > 0 && (
            <Menu
              aria-label={tableColumnsLabel(locale)}
              selectionMode="multiple"
              selectedKeys={hideable.filter((column) => visibility[column.key] !== false).map((column) => column.key)}
              onSelectionChange={(keys) => {
                const shown = keys === "all" ? new Set(hideable.map((column) => column.key)) : new Set([...keys].map(String));
                setVisibility(Object.fromEntries(hideable.map((column) => [column.key, shown.has(column.key)])));
              }}
              items={hideable.map((column) => ({ id: column.key, label: column.header }))}
              trigger={
                <Button size="small" variant="subtle" iconBefore="columns-3">
                  {tableColumnsLabel(locale)}
                </Button>
              }
            />
          )}
        </Toolbar>
      )}

      {status === "error" ? (
        <div data-slot="data-table-error" className="rounded-ds-large bg-ds-surface-raised py-ds-400 shadow-ds-raised">
          <EmptyState
            size="small"
            tone="danger"
            icon="cloud-off"
            announce
            title={tableLoadFailedLabel(locale)}
            description={tableLoadFailedHintLabel(locale)}
            primaryAction={
              <Button size="small" iconBefore="rotate-cw" onPress={() => setReload((n) => n + 1)}>
                {retryLabel(locale)}
              </Button>
            }
          />
        </div>
      ) : showSkeleton ? (
        <div data-slot="data-table-loading" aria-hidden className="flex flex-col overflow-hidden rounded-ds-large bg-ds-surface-raised shadow-ds-raised">
          <div className="h-9 border-b border-ds-border bg-ds-surface-sunken" />
          {Array.from({ length: Math.min(pageSize, 8) }, (_, index) => (
            <div key={index} className={cn("flex items-center gap-ds-300 border-b border-ds-border px-ds-200 last:border-b-0", density === "compact" ? "h-ds-row-compact" : "h-ds-row")}>
              <Skeleton width="18%" height={12} />
              <Skeleton width="30%" height={12} />
              <Skeleton width="16%" height={12} />
            </div>
          ))}
        </div>
      ) : (
        <TableView
          component="DataTable"
          aria-label={label}
          columns={shownColumns}
          rows={pageRows}
          rowKey={rowKey}
          selectionMode={bulkActions.length ? "multiple" : "none"}
          selectedKeys={[...selected].filter((key) => visibleKeys.has(key))}
          onSelectionChange={onSelectionChange}
          sortDescriptor={view.sort}
          onSortChange={(sort) => setView({ sort })}
          density={density}
          onRowAction={onRowAction}
          renderEmptyState={empty}
          virtual={virtual ? { height: (props as { height?: number }).height ?? 480 } : undefined}
        />
      )}

      {!virtual && status !== "error" && total > 0 && (
        <Pagination page={view.page} pageSize={pageSize} total={total} onPageChange={(page) => setView({ page })} formatRange={formatRange} />
      )}
    </section>
  );
}
