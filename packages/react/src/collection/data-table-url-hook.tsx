"use client";

import * as React from "react";
import type { SortDescriptor } from "react-aria-components";

import { useDesignSystemNavigate } from "../navigate-context";
import { readView, writeView, type DataTableView } from "./data-table-url";

export type DataTableUrlFilter = { key: string; options: readonly { id: string }[] };

export type UseDataTableUrlOptions = {
  /** The table's `filters`: only their keys are read from the URL, and only values they offer. */
  filters?: readonly DataTableUrlFilter[];
  /** The table's `defaultSort`, left out of the URL. */
  defaultSort?: SortDescriptor;
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
};

const NO_FILTERS: readonly DataTableUrlFilter[] = [];

function initialParams(searchParams?: URLSearchParams | string) {
  if (searchParams !== undefined) return new URLSearchParams(searchParams);
  return new URLSearchParams(typeof window === "undefined" ? "" : window.location.search);
}

/**
 * Keeps a DataTable's view in the URL, so a reload or a shared link shows the same page, sort, filters and search:
 * `<DataTable {...useDataTableUrl({ filters, defaultSort })} … />`. Reads the URL on mount, writes every change through
 * the provider's `navigate`, and follows Back and Forward and a host router's new `searchParams`. The format is
 * flat and readable (`?q=acme&status=active&sort=name&dir=desc&page=2`); defaults are left out.
 */
export function useDataTableUrl({ filters = NO_FILTERS, defaultSort, urlKey, searchParams, routerOptions }: UseDataTableUrlOptions = {}): {
  view: DataTableView;
  onViewChange: (view: DataTableView) => void;
} {
  const navigate = useDesignSystemNavigate();
  const filterKeys = React.useMemo(() => filters.map((filter) => filter.key), [filters]);
  const urlOptions = { urlKey, filterKeys, defaultSort };
  // A view from a URL, keeping only filter values the table offers (a stale or hand-edited `?status=foo` is ignored).
  const viewFrom = (params: URLSearchParams): DataTableView => {
    const read = readView(params, urlOptions);
    const known = Object.fromEntries(
      filters
        .map((filter) => [filter.key, (read.filters[filter.key] ?? []).filter((value) => filter.options.some((option) => option.id === value))] as const)
        .filter(([, values]) => values.length > 0),
    );
    return { ...read, filters: known };
  };
  const [view, setView] = React.useState<DataTableView>(() => viewFrom(initialParams(searchParams)));
  const viewRef = React.useRef(view);
  viewRef.current = view;

  const onViewChange = (next: DataTableView) => {
    viewRef.current = next;
    setView(next);
    if (!navigate || typeof window === "undefined") return;
    const params = writeView(new URLSearchParams(window.location.search), next, urlOptions).toString();
    const href = `${window.location.pathname}${params ? `?${params}` : ""}${window.location.hash}`;
    if (href !== `${window.location.pathname}${window.location.search}${window.location.hash}`) navigate(href, routerOptions as never);
  };

  // The URL moved under the table: Back and Forward, or a host router handing new `searchParams`.
  const adopt = (next: DataTableView) => {
    if (JSON.stringify(next) === JSON.stringify(viewRef.current)) return;
    viewRef.current = next;
    setView(next);
  };
  const adoptRef = React.useRef(adopt);
  adoptRef.current = adopt;
  const viewFromRef = React.useRef(viewFrom);
  viewFromRef.current = viewFrom;
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const onPop = () => adoptRef.current(viewFromRef.current(new URLSearchParams(window.location.search)));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const paramsKey = searchParams === undefined ? undefined : new URLSearchParams(searchParams).toString();
  const firstParams = React.useRef(paramsKey);
  React.useEffect(() => {
    if (paramsKey === undefined || paramsKey === firstParams.current) return;
    firstParams.current = paramsKey;
    adoptRef.current(viewFromRef.current(new URLSearchParams(paramsKey)));
  }, [paramsKey]);

  return { view, onViewChange };
}
