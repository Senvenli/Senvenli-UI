import * as React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { DataTable, useDataTableUrl, type DataTableColumn, type DataTableProps, type DataTableQuery, type UseDataTableUrlOptions } from "./index";
import { readView, writeView } from "./data-table-url";
import { EmptyState } from "../feedback/empty-state";

/** DataTable with its view in the URL, as an app wires it with useDataTableUrl. */
function UrlTable<T extends object>(props: DataTableProps<T> & Pick<UseDataTableUrlOptions, "urlKey" | "searchParams" | "routerOptions">) {
  const { urlKey, searchParams, routerOptions, ...table } = props;
  const url = useDataTableUrl({ filters: table.filters, defaultSort: table.defaultSort, urlKey, searchParams, routerOptions });
  return <DataTable {...(table as DataTableProps<T>)} {...url} />;
}


beforeAll(() => {
  globalThis.CSS ??= {} as typeof CSS;
  CSS.escape ??= (value: string) => value.replace(/[^\w-]/g, (char) => `\\${char}`);
});
afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
  vi.useRealTimers();
});

type Order = { id: string; code: string; customer: string; status: string; total: number };
const STATUSES = ["active", "paused", "closed"];
const ORDERS: Order[] = Array.from({ length: 45 }, (_, index) => ({
  id: `o${index + 1}`,
  code: `ORD-${100 + index}`,
  customer: index % 3 === 0 ? "Acme Ltd" : index % 3 === 1 ? "Birch Supply" : "Cedar Works",
  status: STATUSES[index % 3]!,
  total: 10_000 + index * 1000,
}));
const COLUMNS: DataTableColumn<Order>[] = [
  { key: "code", header: "Order", isSortable: true, isRowHeader: true },
  { key: "customer", header: "Customer", isSortable: true, isHideable: true },
  { key: "status", header: "Status", isHideable: true },
  { key: "total", header: "Total", align: "end", isSortable: true, isHideable: true },
];
const FILTERS = [{ key: "status", label: "Status", options: STATUSES.map((id) => ({ id, label: id })) }];

/** A server that pages, sorts and filters ORDERS like an API would. */
function server() {
  return vi.fn(async (view: DataTableQuery) => {
    let rows = [...ORDERS];
    if (view.search) rows = rows.filter((order) => order.code.includes(view.search) || order.customer.includes(view.search));
    for (const [key, values] of Object.entries(view.filters)) rows = rows.filter((order) => values.includes(String(order[key as keyof Order])));
    if (view.sort) {
      const key = String(view.sort.column) as keyof Order;
      rows.sort((a, b) => (a[key] > b[key] ? 1 : -1) * (view.sort!.direction === "descending" ? -1 : 1));
    }
    return { rows: rows.slice((view.page - 1) * view.pageSize, view.page * view.pageSize), total: rows.length };
  });
}

function inLocale(ui: React.ReactElement, navigate = vi.fn(), locale = "en") {
  // A router that updates the location, as a host router would.
  const go = vi.fn((href: string) => {
    window.history.replaceState(null, "", href);
    navigate(href);
  });
  render(
    <DesignSystemProvider locale={locale} navigate={go}>
      {ui}
    </DesignSystemProvider>,
  );
  return navigate;
}

const codes = () => screen.queryAllByRole("rowheader").map((cell) => cell.textContent);

describe("DataTable URL format", () => {
  const options = { filterKeys: ["status", "region"], defaultSort: { column: "code", direction: "ascending" as const } };

  it("writes only what differs from the defaults, keeps other params, repeats multi-value filters", () => {
    const params = writeView(new URLSearchParams("tab=orders"), { page: 2, search: " acme ", sort: { column: "total", direction: "descending" }, filters: { status: ["active", "paused, late"] } }, options);
    expect(params.toString()).toBe("tab=orders&q=acme&status=active&status=paused%2C+late&sort=total&dir=desc&page=2");
    expect(writeView(new URLSearchParams(), { page: 1, search: "", sort: options.defaultSort, filters: {} }, options).toString()).toBe("");
  });

  it("reads back what it wrote; prefixes with urlKey; ignores unknown params", () => {
    const view = { page: 3, search: "birch", sort: { column: "customer", direction: "ascending" as const }, filters: { status: ["closed"] } };
    const params = writeView(new URLSearchParams("other=1"), view, { ...options, urlKey: "orders" });
    expect(params.get("orders.page")).toBe("3");
    expect(readView(params, { ...options, urlKey: "orders" })).toEqual(view);
    expect(readView(new URLSearchParams("page=-4&evil=1"), options)).toEqual({ page: 1, search: "", sort: options.defaultSort, filters: {} });
  });
});

// Whole lists with a toolbar, menus and pagination: slow in jsdom under a loaded full run.
describe("DataTable", { timeout: 20_000 }, () => {
  it("a shared link opens the same view: page, sort, filters and search come from the URL", async () => {
    const query = server();
    inLocale(<UrlTable aria-label="Orders" columns={COLUMNS} query={query} filters={FILTERS} searchParams="status=paused&sort=total&dir=desc&page=2&pageSize=5" pageSize={5} />);
    await waitFor(() => expect(codes()).toHaveLength(5));
    expect(query).toHaveBeenLastCalledWith({ page: 2, pageSize: 5, search: "", sort: { column: "total", direction: "descending" }, filters: { status: ["paused"] } }, expect.any(AbortSignal));
    expect(screen.getByRole("columnheader", { name: /Total/ }).getAttribute("aria-sort")).toBe("descending");
  });

  it("sorting and paging write the URL through the provider's navigate; a new sort starts at page 1", async () => {
    const navigate = inLocale(<UrlTable aria-label="Orders" columns={COLUMNS} query={server()} pageSize={10} />);
    await waitFor(() => expect(codes()).toHaveLength(10));
    fireEvent.click(screen.getByRole("button", { name: /Next page/ }));
    expect(navigate).toHaveBeenLastCalledWith("/?page=2");
    fireEvent.click(screen.getByRole("columnheader", { name: /Total/ }));
    expect(navigate).toHaveBeenLastCalledWith("/?sort=total&dir=asc");
  });

  it("without useDataTableUrl the table keeps its view and never navigates; onViewChange reports it", async () => {
    const onViewChange = vi.fn();
    const navigate = inLocale(<DataTable aria-label="Orders" columns={COLUMNS} query={server()} pageSize={10} onViewChange={onViewChange} />);
    await waitFor(() => expect(codes()).toHaveLength(10));
    fireEvent.click(screen.getByRole("button", { name: /Next page/ }));
    expect(onViewChange).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));
    expect(navigate).not.toHaveBeenCalled();
  });

  it("a controlled view drives the table", async () => {
    const query = server();
    inLocale(<DataTable aria-label="Orders" columns={COLUMNS} query={query} pageSize={5} view={{ page: 3, search: "", filters: {} }} onViewChange={vi.fn()} />);
    await waitFor(() => expect(query).toHaveBeenLastCalledWith(expect.objectContaining({ page: 3 }), expect.any(AbortSignal)));
  });

  it("search updates the list and the URL once typing pauses", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const query = server();
    const navigate = inLocale(<UrlTable aria-label="Orders" columns={COLUMNS} query={query} />);
    await waitFor(() => expect(codes().length).toBeGreaterThan(0));
    const calls = query.mock.calls.length;
    const search = screen.getByRole("searchbox", { name: "Search" });
    fireEvent.change(search, { target: { value: "B" } });
    fireEvent.change(search, { target: { value: "Birch" } });
    expect(query.mock.calls.length).toBe(calls);
    await act(async () => void vi.advanceTimersByTime(350));
    expect(navigate).toHaveBeenLastCalledWith("/?q=Birch");
    await waitFor(() => expect(codes().every((code) => code !== null)).toBe(true));
    expect(query.mock.calls.length).toBe(calls + 1);
  });

  it("selection survives paging and clears after a bulk action; the list reloads", async () => {
    const query = server();
    const remind = vi.fn(async () => {});
    inLocale(<UrlTable aria-label="Orders" columns={COLUMNS} query={query} pageSize={10} bulkActions={[{ id: "remind", label: "Send reminder", onAction: remind }]} />);
    await waitFor(() => expect(codes()).toHaveLength(10));
    fireEvent.click(within(screen.getAllByRole("row")[1]!).getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /Next page/ }));
    await waitFor(() => expect(codes()[0]).toBe("ORD-110"));
    fireEvent.click(within(screen.getAllByRole("row")[2]!).getByRole("checkbox"));
    expect(screen.getByRole("toolbar", { name: "Selected records" }).textContent).toContain("2");
    const before = query.mock.calls.length;
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Send reminder" })));
    expect(remind).toHaveBeenCalledWith(["o1", "o12"]);
    await waitFor(() => expect(screen.queryByRole("toolbar", { name: "Selected records" })).toBeNull());
    expect(query.mock.calls.length).toBeGreaterThan(before);
  });

  it("filters from the toolbar menu; no results offer to clear them", async () => {
    const navigate = inLocale(<UrlTable aria-label="Orders" columns={COLUMNS} rows={ORDERS} filters={FILTERS} searchParams="q=zzz" />);
    expect(screen.getByText("No records match your search and filters")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(codes()).toHaveLength(20);
    fireEvent.click(screen.getByRole("button", { name: "Status" }));
    const option = await screen.findByRole("menuitemcheckbox", { name: "closed" });
    fireEvent.click(option);
    expect(navigate).toHaveBeenLastCalledWith("/?status=closed");
    // A multiple-choice menu stays open for more picks; Esc closes it.
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    expect(screen.getByRole("button", { name: "Status · 1" })).toBeTruthy();
    expect(screen.getAllByRole("row").slice(1).every((row) => row.textContent!.includes("closed"))).toBe(true);
  });

  it("client lists sort and page here; over the threshold they virtualize instead of paging", () => {
    inLocale(<UrlTable aria-label="Orders" columns={COLUMNS} rows={ORDERS} searchParams="sort=total&dir=desc" />);
    expect(codes()[0]).toBe("ORD-144");
    expect(document.querySelector("[data-slot='pagination']")).not.toBeNull();
    expect(document.querySelector("[data-slot='table'][data-virtual]")).toBeNull();
    cleanup();
    inLocale(<UrlTable aria-label="Orders" columns={COLUMNS} rows={ORDERS} virtualizeAbove={40} height={300} />);
    expect(document.querySelector("[data-slot='table'][data-virtual]")).not.toBeNull();
    expect(document.querySelector("[data-slot='pagination']")).toBeNull();
  });

  it("loading shows skeleton rows in the frame; a failed load offers a retry that keeps the view", async () => {
    let fail = true;
    const query = vi.fn(async (view: DataTableQuery) => {
      if (fail) throw new Error("down");
      return { rows: ORDERS.slice(0, view.pageSize), total: ORDERS.length };
    });
    inLocale(<UrlTable aria-label="Orders" columns={COLUMNS} query={query} searchParams="q=ORD" />);
    expect(document.querySelector("[data-slot='data-table-loading']")).not.toBeNull();
    await screen.findByText("The list could not be loaded");
    fail = false;
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(codes()).toHaveLength(20));
    expect(query).toHaveBeenLastCalledWith(expect.objectContaining({ search: "ORD" }), expect.any(AbortSignal));
  });

  it("an empty list says so with the consumer's action; the column picker hides columns but never the row header", () => {
    inLocale(<UrlTable aria-label="Orders" columns={COLUMNS} rows={[]} emptyState={<EmptyState size="small" icon="inbox" title="No orders yet" primaryAction={<button type="button">Add order</button>} />} />);
    expect(screen.getByText("No orders yet")).toBeTruthy();
    cleanup();
    inLocale(<UrlTable aria-label="Orders" columns={COLUMNS} rows={ORDERS} columnVisibility={{ total: false, code: false }} />);
    const headers = screen.getAllByRole("columnheader").map((header) => header.textContent);
    expect(headers).toEqual(["Order", "Customer", "Status"]);
  });

  it("keyboard: arrows move between rows, Space selects; works the same in RTL", async () => {
    for (const locale of ["en", "ar-AE"]) {
      inLocale(<UrlTable aria-label="Orders" columns={COLUMNS} rows={ORDERS} bulkActions={[{ id: "x", label: "Export", onAction: () => {} }]} />, vi.fn(), locale);
      const rows = screen.getAllByRole("row").slice(1);
      act(() => rows[0]!.focus());
      fireEvent.keyDown(document.activeElement!, { key: "ArrowDown" });
      fireEvent.keyUp(document.activeElement!, { key: "ArrowDown" });
      expect(document.activeElement).toBe(rows[1]);
      fireEvent.keyDown(document.activeElement!, { key: " " });
      fireEvent.keyUp(document.activeElement!, { key: " " });
      expect(rows[1]!.getAttribute("aria-selected")).toBe("true");
      cleanup();
    }
  });

  it("virtualized rows stay reachable by keyboard: Ctrl+End reaches the last record", async () => {
    inLocale(<UrlTable aria-label="Orders" columns={COLUMNS} rows={ORDERS} virtualizeAbove={40} height={300} />);
    const first = screen.getAllByRole("row")[1]!;
    act(() => first.focus());
    fireEvent.keyDown(document.activeElement!, { key: "End", ctrlKey: true });
    await waitFor(() => expect(document.activeElement!.textContent).toContain("ORD-144"));
    expect(screen.getByRole("grid").getAttribute("aria-rowcount")).toBe("46");
  });
});

describe("DataTable history, routing and failures", { timeout: 20_000 }, () => {
  it("Back and Forward bring the table along with the URL", async () => {
    inLocale(<UrlTable aria-label="Orders" columns={COLUMNS} rows={ORDERS} />);
    fireEvent.click(screen.getByRole("button", { name: /Next page/ }));
    expect(codes()[0]).toBe("ORD-120");
    act(() => {
      window.history.replaceState(null, "", "/");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(codes()[0]).toBe("ORD-100");
  });

  it("a host router's new searchParams move the view; unknown filter values are ignored", () => {
    function Routed() {
      const [params, setParams] = React.useState("status=bogus");
      return (
        <>
          <button type="button" onClick={() => setParams("status=closed&page=2")}>Link</button>
          <UrlTable aria-label="Orders" columns={COLUMNS} rows={ORDERS} filters={FILTERS} searchParams={params} pageSize={10} />
        </>
      );
    }
    inLocale(<Routed />);
    expect(screen.getByRole("button", { name: "Status" })).toBeTruthy();
    expect(codes()).toHaveLength(10);
    fireEvent.click(screen.getByRole("button", { name: "Link" }));
    expect(screen.getByRole("button", { name: "Status · 1" })).toBeTruthy();
    expect(codes()).toEqual(["ORD-132", "ORD-135", "ORD-138", "ORD-141", "ORD-144"]);
  });

  it("a page past the end moves to the last page", async () => {
    inLocale(<UrlTable aria-label="Orders" columns={COLUMNS} rows={ORDERS} searchParams="page=99" pageSize={20} />);
    await waitFor(() => expect(codes()[0]).toBe("ORD-140"));
    expect(screen.getByRole("button", { name: /3/, current: "page" })).toBeTruthy();
  });

  it("a failed bulk action keeps the selection and the bar, with no unhandled rejection", async () => {
    const fail = vi.fn(async () => {
      throw new Error("boom");
    });
    inLocale(<UrlTable aria-label="Orders" columns={COLUMNS} rows={ORDERS} bulkActions={[{ id: "x", label: "Delete", onAction: fail }]} />);
    fireEvent.click(within(screen.getAllByRole("row")[1]!).getByRole("checkbox"));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Delete" })));
    expect(fail).toHaveBeenCalledWith(["o1"]);
    expect(screen.getByRole("toolbar", { name: "Selected records" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Delete" }).hasAttribute("disabled") || screen.getByRole("button", { name: "Delete" }).getAttribute("aria-disabled") === "true").toBe(false);
  });

  it("virtualized, the header cells carry the sunken fill and every row keeps its divider", () => {
    inLocale(<UrlTable aria-label="Orders" columns={COLUMNS} rows={ORDERS} virtualizeAbove={40} height={300} />);
    const header = screen.getAllByRole("columnheader")[0]!;
    expect(header.className).toContain("bg-ds-surface-sunken");
    const cells = document.querySelectorAll("[data-slot='table'][data-virtual] [data-slot='table-cell']");
    expect(cells.length).toBeGreaterThan(0);
    expect([...cells].every((cell) => !cell.className.includes("group-last/row:border-b-0"))).toBe(true);
  });

  it("Back to a page of an unfiltered server list stays there: the clamp waits for that view's own total", async () => {
    const query = server();
    const navigate = inLocale(<UrlTable aria-label="Orders" columns={COLUMNS} query={query} filters={FILTERS} pageSize={10} searchParams="page=3" />);
    await waitFor(() => expect(codes()[0]).toBe("ORD-120"));
    act(() => {
      window.history.replaceState(null, "", "/?status=closed");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    await waitFor(() => expect(codes()).toHaveLength(10));
    act(() => {
      window.history.replaceState(null, "", "/?page=3");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    await waitFor(() => expect(codes()[0]).toBe("ORD-120"));
    expect(query).toHaveBeenLastCalledWith(expect.objectContaining({ page: 3, filters: {} }), expect.any(AbortSignal));
    expect(navigate).not.toHaveBeenCalled();
    expect(window.location.search).toBe("?page=3");
  });
});


describe("DataTable derived filters and row focus", { timeout: 20_000 }, () => {
  it("a client filter can read a derived value", () => {
    const tagged = ORDERS.slice(0, 6).map((order, index) => ({ ...order, tags: index % 2 ? ["wholesale"] : ["retail", "wholesale"] }));
    const filters = [{ key: "channel", label: "Channel", options: [{ id: "retail", label: "Retail" }, { id: "wholesale", label: "Wholesale" }], value: (row: (typeof tagged)[number]) => row.tags }];
    inLocale(<UrlTable aria-label="Orders" columns={COLUMNS} rows={tagged} filters={filters as never} searchParams="channel=retail" />);
    expect(codes()).toEqual(["ORD-100", "ORD-102", "ORD-104"]);
  });

  it("keyboard focus shows the ring on the row; Left and Right follow the reading direction", () => {
    for (const [locale, intoCells] of [["en", "ArrowRight"], ["ar-AE", "ArrowLeft"]] as const) {
      inLocale(<UrlTable aria-label="Orders" columns={COLUMNS} rows={ORDERS} />, vi.fn(), locale);
      const row = screen.getAllByRole("row")[1]!;
      fireEvent.keyDown(document.body, { key: "Tab" });
      act(() => row.focus());
      expect(row.hasAttribute("data-focus-visible")).toBe(true);
      expect(row.className).toContain("data-[focus-visible]:inset-ring-2");
      fireEvent.keyDown(document.activeElement!, { key: intoCells });
      expect(document.activeElement!.getAttribute("role")).toBe("rowheader");
      expect(document.activeElement!.textContent).toBe("ORD-100");
      cleanup();
    }
  });
});
