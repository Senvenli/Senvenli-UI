import * as React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { DataTable, Table, type DataTableColumn, type TableColumn } from "./index";
import { TableView } from "./table";

beforeAll(() => {
  // jsdom lacks CSS.escape, which React Aria's collections use to find rows.
  globalThis.CSS ??= {} as typeof CSS;
  CSS.escape ??= (value: string) => value.replace(/[^\w-]/g, (char) => `\\${char}`);
});
afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
  vi.unstubAllGlobals();
});

function inLocale(ui: React.ReactElement, dir?: "rtl") {
  return render(
    <div dir={dir}>
      <DesignSystemProvider locale={dir ? "ar-EG" : "en"} navigate={(href: string) => window.history.replaceState(null, "", href)}>{ui}</DesignSystemProvider>
    </div>,
  );
}

const classesOf = (element: Element | null) => (element?.getAttribute("class") ?? "").split(/\s+/);

type Order = { id: string; code: string; customer: string; total: number; note: string };
const ORDERS: Order[] = [
  { id: "o1", code: "ORD-101", customer: "Birch Supply", total: 30_000, note: "Short" },
  { id: "o2", code: "ORD-102", customer: "Acme Ltd", total: 10_000, note: "Gift wrap" },
  { id: "o3", code: "ORD-103", customer: "Cedar Works", total: 20_000, note: "—" },
];
const PLAIN: TableColumn<Order>[] = [
  { key: "code", header: "Order", isSortable: true, isRowHeader: true },
  { key: "customer", header: "Customer" },
  { key: "note", header: "Note", wrap: true },
  { key: "total", header: "Total", align: "end", isSortable: true },
];
const HIDING: TableColumn<Order>[] = [
  { key: "code", header: "Order", isSortable: true, isRowHeader: true },
  { key: "customer", header: "Customer", hideBelow: "md" },
  { key: "note", header: "Note", wrap: true, hideBelow: "lg" },
  { key: "total", header: "Total", align: "end", isSortable: true },
];

/** The header and every body cell of the column at `index` (no selection column). */
function columnParts(index: number) {
  const header = screen.getAllByRole("columnheader")[index]!;
  const cells = screen.getAllByRole("row").slice(1).map((row) => row.children[index]!);
  return [header, ...cells];
}

describe("Table hideBelow", () => {
  it("without hideBelow the DOM is the same: no hide attribute and no breakpoint class", () => {
    const { container } = inLocale(<Table aria-label="Orders" columns={PLAIN} rows={ORDERS} />);
    expect(container.querySelector("[data-hide-below]")).toBeNull();
    expect(container.innerHTML).not.toMatch(/max-(sm|md|lg|xl):hidden/);
    const plain = container.innerHTML;
    cleanup();
    // An explicit undefined is the same as leaving it out.
    const { container: again } = inLocale(<Table aria-label="Orders" columns={PLAIN.map((column) => ({ ...column, hideBelow: undefined }))} rows={ORDERS} />);
    const ids = (html: string) => html.replace(/_r_[0-9a-z]+_/g, "").replace(/description-\d+/g, "description");
    expect(ids(again.innerHTML)).toBe(ids(plain));
  });

  it("hides the header and every cell of the column below its breakpoint, with display:none (hidden from assistive tech)", () => {
    inLocale(<Table aria-label="Orders" columns={HIDING} rows={ORDERS} />);
    for (const part of columnParts(1)) {
      expect(part.getAttribute("data-hide-below")).toBe("md");
      expect(classesOf(part)).toContain("max-md:hidden");
    }
    for (const part of columnParts(2)) {
      expect(part.getAttribute("data-hide-below")).toBe("lg");
      expect(classesOf(part)).toContain("max-lg:hidden");
    }
    for (const index of [0, 3]) {
      for (const part of columnParts(index)) {
        expect(part.hasAttribute("data-hide-below")).toBe(false);
        expect(classesOf(part).some((name) => /^max-(sm|md|lg|xl):hidden$/.test(name))).toBe(false);
      }
    }
  });

  it("each breakpoint maps to the DS's Tailwind breakpoint", () => {
    for (const breakpoint of ["sm", "md", "lg", "xl"] as const) {
      inLocale(<Table aria-label="Orders" columns={[PLAIN[0]!, { ...PLAIN[1]!, hideBelow: breakpoint }]} rows={ORDERS} />);
      for (const part of columnParts(1)) expect(classesOf(part)).toContain(`max-${breakpoint}:hidden`);
      cleanup();
    }
  });

  it("is ignored on the row header column, which names each row", () => {
    inLocale(<Table aria-label="Orders" columns={[{ ...PLAIN[0]!, hideBelow: "md" }, PLAIN[1]!]} rows={ORDERS} />);
    for (const part of columnParts(0)) {
      expect(part.hasAttribute("data-hide-below")).toBe(false);
      expect(classesOf(part)).not.toContain("max-md:hidden");
    }
    // The default row header (the first column) too.
    cleanup();
    inLocale(<Table aria-label="Orders" columns={[{ key: "code", header: "Order", hideBelow: "sm" }, PLAIN[1]!]} rows={ORDERS} />);
    expect(classesOf(columnParts(0)[0]!)).not.toContain("max-sm:hidden");
  });

  it("keeps the hidden column in place in a selectable table, after the selection column", () => {
    inLocale(<Table aria-label="Orders" columns={HIDING} rows={ORDERS} selectionMode="multiple" />);
    const headers = screen.getAllByRole("columnheader");
    expect(headers[0]!.getAttribute("data-slot")).toBe("table-selection-column");
    expect(headers[2]!.getAttribute("data-hide-below")).toBe("md");
  });

  it("sorting a visible column still works with a hidden column present", () => {
    function Sorted() {
      const [sort, setSort] = React.useState<{ column: string | number; direction: "ascending" | "descending" }>({ column: "code", direction: "ascending" });
      const rows = [...ORDERS].sort((a, b) => {
        const key = sort.column as keyof Order;
        return (a[key] > b[key] ? 1 : -1) * (sort.direction === "descending" ? -1 : 1);
      });
      return <Table aria-label="Orders" columns={HIDING} rows={rows} sortDescriptor={sort} onSortChange={(next) => setSort(next as typeof sort)} />;
    }
    inLocale(<Sorted />);
    const total = screen.getByRole("columnheader", { name: /Total/ });
    expect(total.getAttribute("aria-sort")).toBe("none");
    fireEvent.click(total);
    expect(total.getAttribute("aria-sort")).toBe("ascending");
    const codes = () => screen.getAllByRole("rowheader").map((cell) => cell.textContent);
    expect(codes()).toEqual(["ORD-102", "ORD-103", "ORD-101"]);
    fireEvent.click(total);
    expect(codes()).toEqual(["ORD-101", "ORD-103", "ORD-102"]);
    // The hidden column's cells follow their rows.
    expect(columnParts(1).slice(1).map((cell) => cell.textContent)).toEqual(["Birch Supply", "Cedar Works", "Acme Ltd"]);
    expect(columnParts(1).every((part) => classesOf(part).includes("max-md:hidden"))).toBe(true);
  });

  it("DataTable passes it through: the column hides below the breakpoint and the other columns still sort", () => {
    const columns: DataTableColumn<Order>[] = [
      { key: "code", header: "Order", isSortable: true, isRowHeader: true },
      { key: "customer", header: "Customer", isSortable: true, hideBelow: "sm", isHideable: true },
      { key: "total", header: "Total", align: "end", isSortable: true },
    ];
    inLocale(<DataTable aria-label="Orders" columns={columns} rows={ORDERS} />);
    for (const part of columnParts(1)) expect(classesOf(part)).toContain("max-sm:hidden");
    fireEvent.click(screen.getByRole("columnheader", { name: /Total/ }));
    expect(screen.getAllByRole("rowheader").map((cell) => cell.textContent)).toEqual(["ORD-102", "ORD-103", "ORD-101"]);
  });

  it("in RTL it is the same logical hiding (no physical classes)", () => {
    inLocale(<Table aria-label="Orders" columns={HIDING} rows={ORDERS} />, "rtl");
    for (const part of columnParts(1)) expect(classesOf(part)).toContain("max-md:hidden");
  });

  describe("virtualized (the layout places the columns itself, so a narrow viewport drops the column)", () => {
    function stubViewport(widthRem: number) {
      vi.stubGlobal("matchMedia", (query: string) => ({
        matches: Number(/(\d+)rem/.exec(query)![1]) <= widthRem,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }));
    }
    const headers = () => screen.getAllByRole("columnheader").map((header) => header.textContent);

    it("narrower than md: the md column is dropped; wider: it is there", () => {
      stubViewport(45);
      inLocale(<TableView aria-label="Orders" columns={HIDING} rows={ORDERS} virtual={{ height: 300 }} />);
      expect(headers()).toEqual(["Order", "Total"]);
      cleanup();
      stubViewport(50);
      inLocale(<TableView aria-label="Orders" columns={HIDING} rows={ORDERS} virtual={{ height: 300 }} />);
      expect(headers()).toEqual(["Order", "Customer", "Total"]);
      cleanup();
      stubViewport(90);
      inLocale(<TableView aria-label="Orders" columns={HIDING} rows={ORDERS} virtual={{ height: 300 }} />);
      expect(headers()).toEqual(["Order", "Customer", "Note", "Total"]);
      // Virtualized cells carry no breakpoint class (they are display:flex boxes; the column is dropped instead).
      expect(document.querySelector("[data-slot='table']")!.innerHTML).not.toMatch(/max-(sm|md|lg|xl):hidden/);
    });
  });

  describe("plain table at a narrow viewport (the hidden column leaves the collection)", () => {
    function stubViewport(widthRem: number) {
      vi.stubGlobal("matchMedia", (query: string) => ({
        matches: Number(/(\d+)rem/.exec(query)![1]) <= widthRem,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }));
    }
    const headers = () => screen.getAllByRole("columnheader").map((header) => header.textContent);
    function key(name: string) {
      fireEvent.keyDown(document.activeElement!, { key: name });
      fireEvent.keyUp(document.activeElement!, { key: name });
      return document.activeElement as HTMLElement;
    }

    it("narrower than md: the md and lg columns are not rendered at all; wider: they are", () => {
      stubViewport(45);
      inLocale(<Table aria-label="Orders" columns={HIDING} rows={ORDERS} />);
      expect(headers()).toEqual(["Order", "Total"]);
      expect(screen.getAllByRole("row")[1]!.children).toHaveLength(2);
      cleanup();
      stubViewport(50);
      inLocale(<Table aria-label="Orders" columns={HIDING} rows={ORDERS} />);
      expect(headers()).toEqual(["Order", "Customer", "Total"]);
      cleanup();
      stubViewport(90);
      inLocale(<Table aria-label="Orders" columns={HIDING} rows={ORDERS} />);
      expect(headers()).toEqual(["Order", "Customer", "Note", "Total"]);
    });

    it("the arrow keys never land on a hidden column, and ↓ keeps the column", () => {
      for (const dir of [undefined, "rtl"] as const) {
        stubViewport(45);
        inLocale(<Table aria-label="Orders" columns={HIDING} rows={ORDERS} />, dir);
        const [into, back] = dir ? (["ArrowLeft", "ArrowRight"] as const) : (["ArrowRight", "ArrowLeft"] as const);
        const rows = screen.getAllByRole("row").slice(1);
        act(() => rows[0]!.focus());
        const visited = [key(into), key(into)];
        // Into the row header, then straight to Total: the md and lg columns are not in the way.
        expect(visited[0]!.getAttribute("role")).toBe("rowheader");
        expect(visited[1]!.textContent).toBe("30000");
        // Every cell focus can reach in the row is a visible one.
        const reachable = Array.from(rows[0]!.querySelectorAll("[role='gridcell'], [role='rowheader']"));
        expect(reachable).toEqual(visited);
        expect(document.querySelector("[data-hide-below]")).toBeNull();
        // ↓ from the Total cell stays in the Total column.
        const below = key("ArrowDown");
        expect(below).toBe(rows[1]!.children[1]);
        expect(below.textContent).toBe("10000");
        const previous = key(back);
        expect(previous.getAttribute("role")).toBe("rowheader");
        expect(previous.textContent).toBe("ORD-102");
        cleanup();
        vi.unstubAllGlobals();
      }
    });

    it("sorting a visible column still works while a column is hidden", () => {
      stubViewport(45);
      function Sorted() {
        const [sort, setSort] = React.useState<{ column: string | number; direction: "ascending" | "descending" }>({ column: "code", direction: "ascending" });
        const rows = [...ORDERS].sort((a, b) => {
          const column = sort.column as keyof Order;
          return (a[column] > b[column] ? 1 : -1) * (sort.direction === "descending" ? -1 : 1);
        });
        return <Table aria-label="Orders" columns={HIDING} rows={rows} sortDescriptor={sort} onSortChange={(next) => setSort(next as typeof sort)} />;
      }
      inLocale(<Sorted />);
      const total = screen.getByRole("columnheader", { name: /Total/ });
      // By keyboard: focus the header and press Enter.
      act(() => total.focus());
      key("Enter");
      expect(total.getAttribute("aria-sort")).toBe("ascending");
      expect(screen.getAllByRole("rowheader").map((cell) => cell.textContent)).toEqual(["ORD-102", "ORD-103", "ORD-101"]);
      fireEvent.click(total);
      expect(total.getAttribute("aria-sort")).toBe("descending");
      expect(headers()).toEqual(["Order", "Total"]);
    });

    it("hydrates a server-rendered table without a mismatch, then drops the hidden columns", async () => {
      // The server has no viewport: every column, the narrow-screen ones hidden by their CSS class.
      vi.stubGlobal("matchMedia", undefined);
      const ui = (
        <DesignSystemProvider locale="en" navigate={() => {}}>
          <Table aria-label="Orders" columns={HIDING} rows={ORDERS} />
        </DesignSystemProvider>
      );
      const html = renderToString(ui);
      expect(html).toMatch(/max-md:hidden/);
      vi.unstubAllGlobals();
      stubViewport(45);
      const host = document.createElement("div");
      host.innerHTML = html;
      document.body.append(host);
      const recoverable = vi.fn();
      const errors = vi.spyOn(console, "error").mockImplementation(() => {});
      let root: ReturnType<typeof hydrateRoot> | undefined;
      await act(async () => {
        root = hydrateRoot(host, ui, { onRecoverableError: recoverable });
      });
      expect(recoverable).not.toHaveBeenCalled();
      expect(errors.mock.calls.filter((call) => /hydrat/i.test(String(call[0])))).toEqual([]);
      expect(headers()).toEqual(["Order", "Total"]);
      errors.mockRestore();
      act(() => root!.unmount());
      host.remove();
    });

    it("warns in development when hideBelow is set on the row header (and ignores it)", () => {
      stubViewport(45);
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      inLocale(<Table aria-label="Orders" columns={[{ ...PLAIN[0]!, hideBelow: "md" }, PLAIN[1]!]} rows={ORDERS} />);
      expect(headers()).toEqual(["Order", "Customer"]);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('hideBelow="md" is ignored on the row header column "code"'));
      warn.mockClear();
      cleanup();
      inLocale(<Table aria-label="Orders" columns={HIDING} rows={ORDERS} />);
      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });
  });
});

describe("Table hideBelow on resize", () => {
  /** A viewport whose width can change; each MediaQueryList notifies its listeners. */
  function resizableViewport(initialRem: number) {
    let width = initialRem;
    const lists: { query: string; listeners: Set<() => void>; matches: boolean }[] = [];
    const matchMedia = vi.fn((query: string) => {
      const list = {
        query,
        listeners: new Set<() => void>(),
        get matches() {
          return Number(/(\d+)rem/.exec(query)![1]) <= width;
        },
        media: query,
        addEventListener: (_: string, listener: () => void) => list.listeners.add(listener),
        removeEventListener: (_: string, listener: () => void) => list.listeners.delete(listener),
      };
      lists.push(list);
      return list;
    });
    vi.stubGlobal("matchMedia", matchMedia);
    return {
      matchMedia,
      resize(rem: number) {
        width = rem;
        act(() => lists.forEach((list) => list.listeners.forEach((listener) => listener())));
      },
    };
  }

  it("creates the MediaQueryLists once, not on every snapshot", () => {
    const viewport = resizableViewport(90);
    const { rerender } = inLocale(<Table aria-label="Orders" columns={HIDING} rows={ORDERS} />);
    const created = viewport.matchMedia.mock.calls.length;
    expect(created).toBe(4);
    rerender(
      <div>
        <DesignSystemProvider locale="en" navigate={() => {}}>
          <Table aria-label="Orders" columns={HIDING} rows={ORDERS} />
        </DesignSystemProvider>
      </div>,
    );
    viewport.resize(45);
    viewport.resize(90);
    expect(viewport.matchMedia.mock.calls.length).toBe(created);
  });

  it("drops and restores the column as the viewport crosses its breakpoint", () => {
    const viewport = resizableViewport(90);
    inLocale(<Table aria-label="Orders" columns={HIDING} rows={ORDERS} />);
    const headers = () => screen.getAllByRole("columnheader").map((header) => header.textContent);
    expect(headers()).toEqual(["Order", "Customer", "Note", "Total"]);
    viewport.resize(50);
    expect(headers()).toEqual(["Order", "Customer", "Total"]);
    viewport.resize(90);
    expect(headers()).toEqual(["Order", "Customer", "Note", "Total"]);
  });

  it("when the focused cell's column is dropped, focus stays in that row on a visible cell (React Aria's grid state)", () => {
    const viewport = resizableViewport(90);
    inLocale(<Table aria-label="Orders" columns={HIDING} rows={ORDERS} />);
    const row = screen.getAllByRole("row")[2]!;
    // By keyboard, as React Aria tracks it: into the row, past the row header, onto the Customer cell.
    act(() => row.focus());
    for (const _ of [1, 2]) {
      fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" });
      fireEvent.keyUp(document.activeElement!, { key: "ArrowRight" });
    }
    const customer = document.activeElement as HTMLElement;
    expect(customer.textContent).toBe("Acme Ltd");
    viewport.resize(45);
    expect(customer.isConnected).toBe(false);
    // The cell now at that index in the same row (Total): not the page, not a hidden column.
    const focused = document.activeElement as HTMLElement;
    expect(focused).not.toBe(document.body);
    expect(focused.closest("[role=row]")).toBe(screen.getAllByRole("row")[2]);
    expect(focused.hasAttribute("data-hide-below")).toBe(false);
    expect(focused.textContent).toBe("10000");
  });

  it("does not pull focus back into the table when it was outside", () => {
    const viewport = resizableViewport(90);
    inLocale(
      <>
        <button type="button">Outside</button>
        <Table aria-label="Orders" columns={HIDING} rows={ORDERS} />
      </>,
    );
    const row = screen.getAllByRole("row")[1]!;
    act(() => (row.children[1] as HTMLElement).focus());
    act(() => screen.getByRole("button", { name: "Outside" }).focus());
    act(() => (document.activeElement as HTMLElement).blur());
    viewport.resize(45);
    expect(document.activeElement).toBe(document.body);
  });
});

