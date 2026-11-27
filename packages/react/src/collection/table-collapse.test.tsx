import * as React from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { DataTable, Table, type TableColumn } from "./index";

beforeAll(() => {
  globalThis.CSS ??= {} as typeof CSS;
  CSS.escape ??= (value: string) => value.replace(/[^\w-]/g, (char) => `\\${char}`);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function stubViewport(widthRem: number) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    // Width queries answer for the stubbed viewport; any other (reduced motion) is false.
    matches: /(\d+)rem/.test(query) ? Number(/(\d+)rem/.exec(query)![1]) <= widthRem : false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

type Customer = { id: string; name: string; email: string; city: string; orders: number };
const ROWS: Customer[] = [
  { id: "c1", name: "Ada Lovelace", email: "ada@example.com", city: "London", orders: 42 },
  { id: "c2", name: "Grace Hopper", email: "grace@example.com", city: "New York", orders: 18 },
];
const COLUMNS: TableColumn<Customer>[] = [
  { key: "name", header: "Customer", isRowHeader: true, description: (row) => row.email },
  { key: "city", header: "City" },
  { key: "orders", header: "Orders", align: "end" },
];
const inLocale = (ui: React.ReactElement) => render(<DesignSystemProvider locale="en" navigate={vi.fn()}>{ui}</DesignSystemProvider>);

describe("Table collapseBelow", () => {
  it("below the breakpoint: a list of cards, the row header as title and the other columns as label–value lines", () => {
    stubViewport(30);
    inLocale(<Table aria-label="Customers" columns={COLUMNS} rows={ROWS} collapseBelow="md" />);
    expect(screen.queryByRole("table")).toBeNull();
    const list = screen.getByRole("grid", { name: "Customers" });
    const cards = within(list).getAllByRole("row");
    expect(cards).toHaveLength(2);
    const first = cards[0]!;
    expect(first.querySelector("[data-slot='table-card-title']")!.textContent).toBe("Ada Lovelace");
    expect(first.querySelector("[data-slot='table-card-description']")!.textContent).toBe("ada@example.com");
    const fields = first.querySelector("[data-slot='table-card-fields']")!;
    expect([...fields.querySelectorAll("dt")].map((dt) => dt.textContent)).toEqual(["City", "Orders"]);
    expect([...fields.querySelectorAll("dd")].map((dd) => dd.textContent)).toEqual(["London", "42"]);
  });

  it("at or above the breakpoint, and without collapseBelow: the table", () => {
    stubViewport(50);
    inLocale(<Table aria-label="Customers" columns={COLUMNS} rows={ROWS} collapseBelow="md" />);
    expect(screen.getByRole("grid", { name: "Customers" }).tagName).toBe("TABLE");
    cleanup();
    stubViewport(30);
    inLocale(<Table aria-label="Customers" columns={COLUMNS} rows={ROWS} />);
    expect(screen.getByRole("grid", { name: "Customers" }).tagName).toBe("TABLE");
  });

  it("selection and onRowAction work on cards; renderCollapsedRow replaces the lines", () => {
    stubViewport(30);
    const onRowAction = vi.fn();
    const onSelectionChange = vi.fn();
    inLocale(
      <Table
        aria-label="Customers"
        columns={COLUMNS}
        rows={ROWS}
        collapseBelow="md"
        selectionMode="multiple"
        onSelectionChange={onSelectionChange}
        onRowAction={onRowAction}
        renderCollapsedRow={(row) => <span data-testid="own">{row.name} · {row.city}</span>}
      />,
    );
    expect(screen.getAllByTestId("own").map((node) => node.textContent)).toEqual(["Ada Lovelace · London", "Grace Hopper · New York"]);
    fireEvent.click(screen.getAllByTestId("own")[0]!);
    expect(onRowAction).toHaveBeenCalledWith("c1");
    const checkbox = within(screen.getAllByRole("row")[1]!).getByRole("checkbox");
    act(() => checkbox.click());
    expect([...(onSelectionChange.mock.calls.at(-1)![0] as Set<string>)]).toEqual(["c2"]);
  });

  it("loading with no rows shows card skeletons; the frame is busy", () => {
    stubViewport(30);
    inLocale(<Table aria-label="Customers" columns={COLUMNS} rows={[]} collapseBelow="md" isLoading />);
    expect(document.querySelector("[data-slot='table-cards-loading']")?.getAttribute("aria-hidden")).toBe("true");
    expect(document.querySelector("[data-slot='table']")!.getAttribute("aria-busy")).toBe("true");
  });

  it("DataTable passes it through: search and paging stay around the cards", () => {
    stubViewport(30);
    const rows = Array.from({ length: 25 }, (_, index) => ({ ...ROWS[0]!, id: `c${index}`, name: `Customer ${index + 1}` }));
    inLocale(<DataTable aria-label="Customers" columns={COLUMNS} rows={rows} collapseBelow="md" />);
    expect(document.querySelector("[data-slot='table-cards']")).not.toBeNull();
    expect(screen.getByRole("searchbox")).toBeTruthy();
    expect(document.querySelector("[data-slot='pagination']")).not.toBeNull();
    expect(screen.getAllByRole("row")).toHaveLength(20);
  });
});
