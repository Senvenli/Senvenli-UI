import * as React from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { Link } from "../action/index";
import { Table, type TableColumn } from "./index";
import { Text } from "../display/typography";
import { Stack } from "../layout/stack";

beforeAll(() => {
  // jsdom lacks CSS.escape, which React Aria's collections use to find rows.
  globalThis.CSS ??= {} as typeof CSS;
  CSS.escape ??= (value: string) => value.replace(/[^\w-]/g, (char) => `\\${char}`);
});
afterEach(cleanup);

function inLocale(ui: React.ReactElement, dir?: "rtl") {
  return render(
    <div dir={dir}>
      <DesignSystemProvider locale={dir ? "ar-EG" : "en"} navigate={vi.fn()}>{ui}</DesignSystemProvider>
    </div>,
  );
}

const classesOf = (element: Element | null) => (element?.getAttribute("class") ?? "").split(/\s+/);

type Order = { id: string; code: string; customer: string; phone: string; status: string; total: string; note: string };
const ROWS: Order[] = [
  { id: "o1", code: "ORD-0914", customer: "Alice Martin", phone: "+44 20 7946 0958", status: "Confirmed", total: "$248.00", note: "Short" },
  { id: "o2", code: "ORD-0913", customer: "Ben Carter", phone: "+1 202 555 0143", status: "Delivered", total: "$186.00", note: "A very long note ".repeat(8) },
  { id: "o3", code: "ORD-0911", customer: "Chloe Davis", phone: "chloe@example.com", status: "Awaiting payment", total: "$74.00", note: "—" },
];
const COLUMNS: TableColumn<Order>[] = [
  { key: "code", header: "Order", isSortable: true, isRowHeader: true },
  { key: "customer", header: "Customer", render: (row) => <Stack space="space-0"><Text truncate>{row.customer}</Text><Text size="body-small" tone="subtle" truncate><bdi>{row.phone}</bdi></Text></Stack> },
  { key: "note", header: "Note", wrap: true },
  { key: "total", header: "Amount", align: "end", isSortable: true },
];

function SortableTable(props: Partial<React.ComponentProps<typeof Table<Order>>>) {
  const [sort, setSort] = React.useState<{ column: string | number; direction: "ascending" | "descending" }>({ column: "code", direction: "ascending" });
  return <Table aria-label="Orders" columns={COLUMNS} rows={ROWS} sortDescriptor={sort} onSortChange={(next) => setSort(next as typeof sort)} {...props} />;
}

describe("Table", () => {
  it("is a named grid with column headers, a row header and the row's cells", () => {
    inLocale(<SortableTable />);
    const grid = screen.getByRole("grid", { name: "Orders" });
    expect(within(grid).getAllByRole("columnheader").map((header) => header.textContent)).toEqual(["Order", "Customer", "Note", "Amount"]);
    expect(within(grid).getAllByRole("rowheader").map((cell) => cell.textContent)).toEqual(["ORD-0914", "ORD-0913", "ORD-0911"]);
    expect(within(grid).getAllByRole("row")).toHaveLength(4);
  });

  it("sortable headers expose aria-sort and the direction icon; a press flips the order", () => {
    inLocale(<SortableTable />);
    const [code, , , total] = screen.getAllByRole("columnheader");
    expect(code!.getAttribute("aria-sort")).toBe("ascending");
    expect(code!.querySelector("[data-slot='table-sort-icon']")!.getAttribute("data-direction")).toBe("ascending");
    expect(total!.getAttribute("aria-sort")).toBe("none");
    expect(total!.querySelector("[data-slot='table-sort-icon']")!.getAttribute("data-direction")).toBe("none");
    expect(screen.getAllByRole("columnheader")[1]!.hasAttribute("aria-sort")).toBe(false);
    fireEvent.click(code!);
    expect(code!.getAttribute("aria-sort")).toBe("descending");
    expect(code!.querySelector("[data-slot='table-sort-icon']")!.getAttribute("data-direction")).toBe("descending");
  });

  it("density sets 48px or 36px rows; numbers sit at the end in tabular figures", () => {
    inLocale(<SortableTable />);
    const cells = screen.getAllByRole("gridcell");
    expect(classesOf(cells[0]!)).toContain("h-ds-row");
    const total = cells.find((cell) => cell.textContent === "$248.00")!;
    expect(classesOf(total)).toEqual(expect.arrayContaining(["text-end", "tabular-nums", "whitespace-nowrap"]));
    cleanup();
    inLocale(<SortableTable density="compact" />);
    expect(classesOf(screen.getAllByRole("gridcell")[0]!)).toContain("h-ds-row-compact");
    expect(document.querySelector("[data-slot='table']")!.getAttribute("data-density")).toBe("compact");
  });

  it("wrapping cells clamp to two lines; the full text floats over the cell without resizing the row", () => {
    inLocale(<SortableTable />);
    const wraps = [...document.querySelectorAll("[data-slot='table-cell-wrap']")];
    expect(wraps).toHaveLength(3);
    expect(classesOf(wraps[1]!)).toContain("line-clamp-2");
    expect(classesOf(wraps[1]!).some((name) => name.includes("line-clamp-none"))).toBe(false);
    expect(wraps[1]!.getAttribute("title")).toBe(ROWS[1]!.note);
    const full = wraps[1]!.parentElement!.querySelector("[data-slot='table-cell-full']")!;
    expect(full.getAttribute("aria-hidden")).toBe("true");
    expect(full.hasAttribute("inert")).toBe(true);
    expect(full.textContent).toBe(ROWS[1]!.note);
    expect(classesOf(full)).toEqual(expect.arrayContaining(["absolute", "hidden", "group-hover/cell:block", "group-data-[focus-visible]/cell:block"]));
  });

  it("multiple selection: row checkboxes, Space selects, the header checkbox goes indeterminate then all", () => {
    const onSelectionChange = vi.fn();
    inLocale(<SortableTable selectionMode="multiple" onSelectionChange={onSelectionChange} />);
    const grid = screen.getByRole("grid");
    expect(grid.getAttribute("aria-multiselectable")).toBe("true");
    const boxes = within(grid).getAllByRole("checkbox");
    expect(boxes).toHaveLength(4);
    const rows = within(grid).getAllByRole("row").slice(1);
    fireEvent.click(boxes[1]!);
    expect(rows[0]!.getAttribute("aria-selected")).toBe("true");
    expect((boxes[0] as HTMLInputElement).indeterminate).toBe(true);
    expect(rows[0]!.querySelector("[data-slot='table-row-marker']")).toBeTruthy();
    act(() => rows[1]!.focus());
    fireEvent.keyDown(rows[1]!, { key: " " });
    fireEvent.keyUp(rows[1]!, { key: " " });
    expect(rows[1]!.getAttribute("aria-selected")).toBe("true");
    fireEvent.click(boxes[0]!);
    expect(rows.every((row) => row.getAttribute("aria-selected") === "true")).toBe(true);
    expect(onSelectionChange).toHaveBeenCalled();
  });

  it("the row opens the record on Enter, and arrows move between rows", () => {
    const onRowAction = vi.fn();
    inLocale(<SortableTable onRowAction={onRowAction} />);
    const rows = screen.getAllByRole("row").slice(1);
    act(() => rows[0]!.focus());
    fireEvent.keyDown(rows[0]!, { key: "ArrowDown" });
    expect(document.activeElement).toBe(rows[1]);
    fireEvent.keyDown(rows[1]!, { key: "Enter" });
    fireEvent.keyUp(rows[1]!, { key: "Enter" });
    expect(onRowAction).toHaveBeenCalledWith("o2");
  });

  it("a press opens the record while nothing is selected, toggles once rows are ticked; the record link always opens", () => {
    const onRowAction = vi.fn();
    const navigate = vi.fn();
    const columns: TableColumn<Order>[] = [
      { key: "code", header: "Order", isRowHeader: true, render: (row) => <Link href={`/orders/${row.id}`}>{row.code}</Link> },
      ...COLUMNS.slice(1),
    ];
    render(
      <DesignSystemProvider locale="en" navigate={navigate}>
        <Table aria-label="Orders" columns={columns} rows={ROWS} selectionMode="multiple" onRowAction={onRowAction} />
      </DesignSystemProvider>,
    );
    const rows = screen.getAllByRole("row").slice(1);
    const press = (element: Element) => {
      fireEvent.pointerDown(element, { pointerType: "mouse", button: 0 });
      fireEvent.pointerUp(element, { pointerType: "mouse", button: 0 });
      fireEvent.click(element, { button: 0 });
    };
    press(within(rows[0]!).getAllByRole("gridcell")[2]!);
    expect(onRowAction).toHaveBeenLastCalledWith("o1");
    expect(rows[0]!.getAttribute("aria-selected")).toBe("false");
    fireEvent.click(within(rows[1]!).getByRole("checkbox"));
    expect(rows[1]!.getAttribute("aria-selected")).toBe("true");
    onRowAction.mockClear();
    press(within(rows[2]!).getAllByRole("gridcell")[2]!);
    expect(onRowAction).not.toHaveBeenCalled();
    expect(rows[2]!.getAttribute("aria-selected")).toBe("true");
    fireEvent.click(within(rows[0]!).getByRole("link", { name: "ORD-0914" }));
    expect(navigate).toHaveBeenCalledWith("/orders/o1", undefined);
  });

  it("single selection still shows a checkbox per row, and no select-all", () => {
    inLocale(<SortableTable selectionMode="single" />);
    expect(screen.getAllByRole("columnheader")[0]!.textContent).toBe("Selection");
    expect(screen.getAllByRole("checkbox")).toHaveLength(3);
    fireEvent.click(screen.getAllByRole("checkbox")[1]!);
    expect(screen.getAllByRole("row")[2]!.getAttribute("aria-selected")).toBe("true");
  });

  it("the header checkbox is named, and selects all", () => {
    inLocale(<SortableTable selectionMode="multiple" />);
    const all = screen.getAllByRole("checkbox")[0]!;
    expect(all.getAttribute("aria-label")).toBeTruthy();
  });

  it("says why it is empty", () => {
    inLocale(<Table aria-label="Orders" columns={COLUMNS} rows={[]} renderEmptyState={() => "No orders yet. Add the first order."} />);
    expect(document.querySelector("[data-slot='table-empty']")!.textContent).toBe("No orders yet. Add the first order.");
  });

  it("with a height, the header is sticky and gets the overflow shadow once rows scroll under it", () => {
    inLocale(<SortableTable maxHeight="120px" />);
    const frame = document.querySelector<HTMLElement>("[data-slot='table']")!;
    expect(frame.style.maxHeight).toBe("120px");
    expect(classesOf(frame.querySelector("[data-slot='table-header']"))).toEqual(expect.arrayContaining(["sticky", "top-0", "in-data-[scrolled]:shadow-ds-overflow"]));
    expect(frame.hasAttribute("data-scrolled")).toBe(false);
    frame.scrollTop = 40;
    fireEvent.scroll(frame);
    expect(frame.hasAttribute("data-scrolled")).toBe(true);
  });

  it("isolates text and numbers, so a phone or a price keeps its order in RTL", () => {
    inLocale(<SortableTable />, "rtl");
    const total = screen.getAllByRole("gridcell").find((cell) => cell.textContent === "$248.00")!;
    expect(total.querySelector("bdi")!.textContent).toBe("$248.00");
    // A phone in a composed cell keeps its order when the app isolates it, as the example does.
    expect([...document.querySelectorAll("bdi")].some((element) => element.textContent === "+44 20 7946 0958")).toBe(true);
  });

  it("in RTL places its marker and padding logically", () => {
    inLocale(<SortableTable selectionMode="single" defaultSelectedKeys={["o1"]} />, "rtl");
    expect(classesOf(document.querySelector("[data-slot='table-row-marker']"))).toEqual(expect.arrayContaining(["start-0", "inset-y-0"]));
    const physical = [...document.querySelectorAll("[data-slot^='table'] *, [data-slot^='table']")].filter((element) =>
      /(^|\s)(?:[\w/-]+:)*(?:ml|mr|pl|pr|left|right|text-left|text-right)-/.test(element.getAttribute("class") ?? ""),
    );
    expect(physical).toEqual([]);
  });
});
