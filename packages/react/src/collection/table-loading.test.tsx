import * as React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { DataTable, Table, type DataTableColumn, type DataTableQuery } from "./index";

beforeAll(() => {
  globalThis.CSS ??= {} as typeof CSS;
  CSS.escape ??= (value: string) => value.replace(/[^\w-]/g, (char) => `\\${char}`);
});
afterEach(cleanup);

type Row = { id: string; name: string; total: number };
const ROWS: Row[] = Array.from({ length: 30 }, (_, index) => ({ id: `r${index + 1}`, name: `Customer ${index + 1}`, total: index * 10 }));
const COLUMNS: DataTableColumn<Row>[] = [
  { key: "name", header: "Customer", isRowHeader: true },
  { key: "total", header: "Total", align: "end" },
];
const inLocale = (ui: React.ReactElement) => render(<DesignSystemProvider locale="en" navigate={vi.fn()}>{ui}</DesignSystemProvider>);
const frame = () => document.querySelector<HTMLElement>("[data-slot='table']")!;

describe("Table isLoading", () => {
  it("with no rows: the real header over skeleton lines shaped by the columns, hidden from assistive tech", () => {
    inLocale(<Table aria-label="Customers" columns={COLUMNS} rows={[]} isLoading emptyState="No customers yet" />);
    expect(screen.getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual(["Customer", "Total"]);
    const skeleton = document.querySelector("[data-slot='table-loading']")!;
    expect(skeleton.getAttribute("aria-hidden")).toBe("true");
    // One line per column in each skeleton row; the end-aligned column's line sits at the end.
    const first = skeleton.firstElementChild!;
    expect(first.children).toHaveLength(2);
    expect(first.children[1]!.className).toContain("justify-end");
    expect(screen.queryByText("No customers yet")).toBeNull();
    expect(frame().getAttribute("aria-busy")).toBe("true");
    expect(document.querySelector("[data-slot='table-loading-bar']")).toBeNull();
  });

  it("with rows: rows stay usable and dim under a sweeping bar; nothing changes once loaded", () => {
    const onRowAction = vi.fn();
    const { rerender } = inLocale(<Table aria-label="Customers" columns={COLUMNS} rows={ROWS.slice(0, 3)} isLoading onRowAction={onRowAction} />);
    expect(frame().hasAttribute("data-loading")).toBe(true);
    expect(document.querySelector("[data-slot='table-loading-bar']")?.getAttribute("aria-hidden")).toBe("true");
    const row = screen.getAllByRole("row")[1]!;
    expect(row.className).toContain("in-data-[loading]:opacity-60");
    fireEvent.click(screen.getByText("Customer 1"));
    expect(onRowAction).toHaveBeenCalledWith("r1");
    rerender(
      <DesignSystemProvider locale="en" navigate={vi.fn()}>
        <Table aria-label="Customers" columns={COLUMNS} rows={ROWS.slice(0, 3)} onRowAction={onRowAction} />
      </DesignSystemProvider>,
    );
    expect(frame().hasAttribute("aria-busy")).toBe(false);
    expect(frame().hasAttribute("data-loading")).toBe(false);
    expect(document.querySelector("[data-slot='table-loading-bar']")).toBeNull();
  });
});

describe("DataTable loading", () => {
  it("a client list takes isLoading from the app", () => {
    inLocale(<DataTable aria-label="Customers" columns={COLUMNS} rows={[]} isLoading />);
    expect(document.querySelector("[data-slot='data-table-loading']")).not.toBeNull();
    expect(document.querySelector("[data-slot='data-table']")!.getAttribute("aria-busy")).toBe("true");
  });

  it("a server list keeps its rows while the next page loads, dimmed under the bar", async () => {
    let release: () => void = () => {};
    const query = vi.fn((view: DataTableQuery) => {
      const result = { rows: ROWS.slice((view.page - 1) * view.pageSize, view.page * view.pageSize), total: ROWS.length };
      return view.page === 1 ? Promise.resolve(result) : new Promise<typeof result>((resolve) => (release = () => resolve(result)));
    });
    inLocale(<DataTable aria-label="Customers" columns={COLUMNS} query={query} pageSize={10} />);
    await screen.findByText("Customer 1");
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    await waitFor(() => expect(frame().hasAttribute("data-loading")).toBe(true));
    expect(screen.getByText("Customer 1")).toBeTruthy();
    expect(document.querySelector("[data-slot='table-loading-bar']")).not.toBeNull();
    await act(async () => release());
    await screen.findByText("Customer 11");
    expect(frame().hasAttribute("data-loading")).toBe(false);
  });

  it("a failed refresh keeps the rows under a banner with Try again; a failed first load keeps the full error", async () => {
    let fail = false;
    const query = vi.fn(async (view: DataTableQuery) => {
      if (fail) throw new Error("down");
      return { rows: ROWS.slice((view.page - 1) * view.pageSize, view.page * view.pageSize), total: ROWS.length };
    });
    inLocale(<DataTable aria-label="Customers" columns={COLUMNS} query={query} pageSize={10} />);
    await screen.findByText("Customer 1");
    fail = true;
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    const banner = await screen.findByRole("alert");
    expect(banner.textContent).toContain("The list could not be refreshed");
    expect(screen.getByText("Customer 1")).toBeTruthy();
    expect(document.querySelector("[data-slot='data-table-error']")).toBeNull();
    // The pager stays, on the page the rows on screen came from.
    expect(screen.getByRole("button", { name: /page 1/i }).getAttribute("aria-current")).toBe("page");
    fail = false;
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await screen.findByText("Customer 11");
    expect(screen.queryByText("The list could not be refreshed")).toBeNull();
  });
});
