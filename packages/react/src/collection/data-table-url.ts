import type { SortDescriptor } from "react-aria-components";

/**
 * How a DataTable's view is written in the URL. One module on purpose: the format is a public contract
 * (links get shared and bookmarked), and a change touches only this file.
 *
 * Flat and readable: `?q=acme&status=active&status=paused&sort=name&dir=desc&page=2`
 * - `q` the search, `page` 1-based, `sort` the column key with `dir=asc|desc`;
 * - each filter its own param named by its key, a multi-value filter repeated (values may hold commas);
 * - defaults are left out (page 1, the default sort, no search, no filters), so a plain list has a clean URL;
 * - `urlKey` prefixes every name (`orders.page`) when two tables share a page.
 * Params that are not the table's are kept as they are.
 */

export type DataTableView = {
  /** 1-based. */
  page: number;
  sort?: SortDescriptor;
  search: string;
  /** Filter key → the selected values; a key with no values is not filtering. */
  filters: Readonly<Record<string, readonly string[]>>;
};

export type DataTableUrlOptions = {
  urlKey?: string;
  /** The filter keys the table knows; other params are never read as filters. */
  filterKeys: readonly string[];
  defaultSort?: SortDescriptor;
};

const RESERVED = ["q", "sort", "dir", "page"] as const;

const nameOf = (name: string, urlKey?: string) => (urlKey ? `${urlKey}.${name}` : name);

/** The view a URL holds, with defaults for what it leaves out. */
export function readView(params: URLSearchParams, { urlKey, filterKeys, defaultSort }: DataTableUrlOptions): DataTableView {
  const get = (name: string) => params.get(nameOf(name, urlKey));
  const page = Number.parseInt(get("page") ?? "", 10);
  const column = get("sort");
  const dir = get("dir");
  const filters: Record<string, string[]> = {};
  for (const key of filterKeys) {
    if ((RESERVED as readonly string[]).includes(key)) continue;
    const values = params.getAll(nameOf(key, urlKey)).filter(Boolean);
    if (values.length) filters[key] = values;
  }
  return {
    page: Number.isFinite(page) && page > 0 ? page : 1,
    sort: column ? { column, direction: dir === "desc" ? "descending" : "ascending" } : defaultSort,
    search: get("q") ?? "",
    filters,
  };
}

/** The URL params for a view: the table's own names rewritten, every other param kept. */
export function writeView(base: URLSearchParams, view: DataTableView, { urlKey, filterKeys, defaultSort }: DataTableUrlOptions): URLSearchParams {
  const next = new URLSearchParams(base);
  for (const name of [...RESERVED, ...filterKeys]) next.delete(nameOf(name, urlKey));
  const search = view.search.trim();
  if (search) next.set(nameOf("q", urlKey), search);
  for (const key of filterKeys) {
    if ((RESERVED as readonly string[]).includes(key)) continue;
    for (const value of view.filters[key] ?? []) next.append(nameOf(key, urlKey), value);
  }
  const isDefaultSort =
    (!view.sort && !defaultSort) ||
    (view.sort && defaultSort && String(view.sort.column) === String(defaultSort.column) && view.sort.direction === defaultSort.direction);
  if (view.sort && !isDefaultSort) {
    next.set(nameOf("sort", urlKey), String(view.sort.column));
    next.set(nameOf("dir", urlKey), view.sort.direction === "descending" ? "desc" : "asc");
  }
  if (view.page > 1) next.set(nameOf("page", urlKey), String(view.page));
  return next;
}
