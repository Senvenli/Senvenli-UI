import * as React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";

import { DesignSystemProvider } from "../provider";
import { DataTable, Table, type DataTableColumn, type TableColumn } from "./index";
import { TableView, uniqueRowKeys } from "./table";

// Repeated row ids are made unique before the rows reach React Aria.
//
// The cause, before: React Aria's TableBody keys its collection by row id (`rowKey`, `row.id` by default).
// Every row is a node in one Map (`keyMap.set(node.key, node)`, react-aria collections/BaseCollection) and
// linked to its neighbours by key (`prevKey`/`nextKey`); the rows are read by walking that chain from the
// first key (`TableCollection.getChildren(body)`, react-aria-components Table). A repeated key resolves to
// the LAST node with that id, so with ids a, b, a the walk went "a" → the last "a" row (its next key null)
// and stopped: ONE row of three rendered (the first "a" and "b", which sat between, were gone; a, b, c, a
// also rendered one row, a, a, b two). Only React's generic "two children with the same key" error was
// logged. Worse, an update that added a repeated id, or added rows while one repeated, left the chain
// cyclic: `TableCollection.commit` → `getRows()` spread an endless iterator and the page froze until the
// heap ran out. Both were reproduced against the code before the keys were made unique.

beforeAll(() => {
  // jsdom lacks CSS.escape, which React Aria's collections use to find rows.
  globalThis.CSS ??= {} as typeof CSS;
  CSS.escape ??= (value: string) => value.replace(/[^\w-]/g, (char) => `\\${char}`);
});

/**
 * Fails fast instead of hanging, for every test here: the freeze walked React Aria's row chain forever, a Map
 * lookup per step, and a test timeout cannot stop a synchronous loop. Over the budget every lookup throws, so
 * a regression ends in an error within a second instead of allocating until the heap runs out (on the source
 * before this change, a first render of ids a, b, a, c, c ran out of heap too). A whole test here stays far
 * under the budget (the busiest, about 115,000 lookups: 6% of it, measured).
 */
const MAP_GET = Map.prototype.get;
const WALK_BUDGET = 2_000_000;
let lookups = 0;
function guardWalk() {
  lookups = 0;
  Map.prototype.get = function guarded(this: Map<unknown, unknown>, key: unknown) {
    if (++lookups > WALK_BUDGET) throw new Error("Regression: the table's row walk did not end");
    return MAP_GET.call(this, key);
  };
}

let warn: MockInstance<typeof console.warn>;
let error: MockInstance<typeof console.error>;
beforeEach(() => {
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  error = vi.spyOn(console, "error").mockImplementation(() => {});
  guardWalk();
});
afterEach(() => {
  Map.prototype.get = MAP_GET;
  cleanup();
  window.history.replaceState(null, "", "/");
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const inLocale = (ui: React.ReactElement) =>
  render(
    <DesignSystemProvider locale="en" navigate={(href: string) => window.history.replaceState(null, "", href)}>
      {ui}
    </DesignSystemProvider>,
  );
const again = (rerender: (ui: React.ReactElement) => void, ui: React.ReactElement) =>
  rerender(
    <DesignSystemProvider locale="en" navigate={(href: string) => window.history.replaceState(null, "", href)}>
      {ui}
    </DesignSystemProvider>,
  );

type Line = { id: string; name: string; total: number };
const COLUMNS: TableColumn<Line>[] = [
  { key: "name", header: "Channel", isRowHeader: true },
  { key: "total", header: "Revenue", align: "end" },
];
const DATA_COLUMNS: DataTableColumn<Line>[] = COLUMNS;
const DUPLICATE: Line[] = [
  { id: "a", name: "Web", total: 1 },
  { id: "b", name: "Phone", total: 2 },
  { id: "a", name: "Office", total: 3 },
];
const UNIQUE: Line[] = [
  { id: "a", name: "Web", total: 1 },
  { id: "b", name: "Phone", total: 2 },
  { id: "c", name: "Office", total: 3 },
];
const DEALER: Line = { id: "c", name: "Dealer", total: 4 };

/** The body rows' row-header text, in order. */
const bodyRows = () => screen.getAllByRole("row").slice(1).map((row) => row.querySelector("[role='rowheader']")?.textContent);
/** The repeated-id warnings logged so far. */
const idWarnings = () =>
  warn.mock.calls.map((call) => String(call[0])).filter((message) => message.includes("row ids") || message.includes("have no id"));
/** Rows with no `id` field at all, so every row's default key is `undefined`. */
type Plain = { name: string; total: number };
const PLAIN_COLUMNS: TableColumn<Plain>[] = [
  { key: "name", header: "Channel", isRowHeader: true },
  { key: "total", header: "Revenue", align: "end" },
];
const PLAIN: Plain[] = [
  { name: "Web", total: 1 },
  { name: "Phone", total: 2 },
  { name: "Office", total: 3 },
];

describe("uniqueRowKeys", () => {
  it("keeps unique ids as they are", () => {
    expect(uniqueRowKeys(["a", "b", 3])).toEqual({ keys: ["a", "b", 3], repeated: [] });
  });

  it("keeps the first id and suffixes the later ones in row order", () => {
    expect(uniqueRowKeys(["a", "b", "a", "a", "b"])).toEqual({ keys: ["a", "b", "a#2", "a#3", "b#2"], repeated: ["a", "b"] });
  });

  it("never collides with a real id that looks like a suffix, wherever it sits", () => {
    expect(uniqueRowKeys(["a", "a", "a#2"]).keys).toEqual(["a", "a#3", "a#2"]);
    expect(uniqueRowKeys(["a#2", "a", "a", "a#3", "a"]).keys).toEqual(["a#2", "a", "a#4", "a#3", "a#5"]);
    const keys = uniqueRowKeys(["a", "a#2", "a", "a#2", "a"]).keys;
    expect(new Set(keys.map(String)).size).toBe(keys.length);
  });

  it("compares ids as strings, as React keys are", () => {
    expect(uniqueRowKeys([1, "1", 1])).toEqual({ keys: [1, "1#2", "1#3"], repeated: [1] });
  });

  it("stays linear when one id repeats many times (rows without ids all collide on one key)", () => {
    // Restarting each copy at #2 made k copies cost O(k²); 20k copies took ~21 s.
    const keys = Array.from({ length: 20_000 }, () => "undefined");
    const start = performance.now();
    const result = uniqueRowKeys(keys);
    expect(performance.now() - start).toBeLessThan(500);
    expect(new Set(result.keys.map(String)).size).toBe(20_000);
    expect(result.keys[19_999]).toBe("undefined#20000");
  });
});

describe("Table with repeated row ids", () => {
  it("renders every row in order: ids a, b, a show three rows (one before)", () => {
    inLocale(<Table aria-label="Revenue channels" columns={COLUMNS} rows={DUPLICATE} />);
    expect(bodyRows()).toEqual(["Web", "Phone", "Office"]);
    cleanup();
    inLocale(<Table aria-label="Revenue" columns={COLUMNS} rows={[...DUPLICATE, DEALER, { id: "c", name: "Agency", total: 5 }]} />);
    expect(bodyRows()).toEqual(["Web", "Phone", "Office", "Dealer", "Agency"]);
  });

  it(
    "an update that repeats an id, or adds rows while one repeats, completes and renders every row (froze before)",
    () => {
      const { rerender } = inLocale(<Table aria-label="Revenue" columns={COLUMNS} rows={UNIQUE} />);
      again(rerender, <Table aria-label="Revenue" columns={COLUMNS} rows={[...UNIQUE, DEALER]} />);
      expect(bodyRows()).toEqual(["Web", "Phone", "Office", "Dealer"]);
      cleanup();
      const second = inLocale(<Table aria-label="Revenue" columns={COLUMNS} rows={DUPLICATE} />);
      again(second.rerender, <Table aria-label="Revenue" columns={COLUMNS} rows={[...DUPLICATE, DEALER]} />);
      expect(bodyRows()).toEqual(["Web", "Phone", "Office", "Dealer"]);
      again(second.rerender, <Table aria-label="Revenue" columns={COLUMNS} rows={[DEALER, ...DUPLICATE, DEALER]} />);
      expect(bodyRows()).toEqual(["Dealer", "Web", "Phone", "Office", "Dealer"]);
      again(second.rerender, <Table aria-label="Revenue" columns={COLUMNS} rows={UNIQUE} />);
      expect(bodyRows()).toEqual(["Web", "Phone", "Office"]);
    },
    10_000,
  );

  it("warns once in development, naming the repeated id and the table", () => {
    inLocale(<Table aria-label="Revenue channels" columns={COLUMNS} rows={DUPLICATE} />);
    expect(idWarnings()).toHaveLength(1);
    expect(idWarnings()[0]).toMatch(/^Table "Revenue channels": the row ids "a" repeat\. /);
    expect(idWarnings()[0]).toContain('"a"');
    expect(idWarnings()[0]).not.toContain('"b"');
    // The keys are unique now, so React has nothing to complain about.
    expect(error).not.toHaveBeenCalled();
  });

  it("says rows have no id when every row lacks one and there is no rowKey (said nothing before)", () => {
    inLocale(<Table aria-label="Revenue channels" columns={PLAIN_COLUMNS} rows={PLAIN} />);
    expect(bodyRows()).toEqual(["Web", "Phone", "Office"]);
    expect(idWarnings()).toHaveLength(1);
    expect(idWarnings()[0]).toMatch(/^Table "Revenue channels": rows have no id; pass rowKey\. /);
    expect(idWarnings()[0]).not.toContain("row ids");
    // No id to suffix: the tail says how the rows are keyed, not "<id>#2".
    expect(idWarnings()[0]).toContain("Every row still renders: each row is keyed by its position");
    // The keys in their literal form: the first row's key is undefined itself, the later ones strings.
    expect(idWarnings()[0]).toContain('keyed by its position: undefined, "undefined#2", "undefined#3", …, and selection');
    expect(idWarnings()[0]).not.toContain("<id>#2");
  });

  it("treats id: null as no id: \"rows have no id\", never null as a repeated id", () => {
    const rows = [
      { id: null, name: "Web", total: 1 },
      { id: null, name: "Phone", total: 2 },
      { id: null, name: "Office", total: 3 },
    ] as unknown as Line[];
    inLocale(<Table aria-label="Revenue" columns={COLUMNS} rows={rows} />);
    expect(bodyRows()).toEqual(["Web", "Phone", "Office"]);
    expect(idWarnings()).toHaveLength(1);
    expect(idWarnings()[0]).toMatch(/^Table "Revenue": rows have no id; pass rowKey\. /);
    expect(idWarnings()[0]).not.toContain("row ids");
    // null is never listed as an id; it shows only as the literal keys the rows get.
    expect(idWarnings()[0]).toContain('each row is keyed by its position: null, "null#2", "null#3", …, and selection');
    expect(idWarnings()[0]).not.toContain("undefined");
  });

  it("rows with id: null and rows with no id field: both literal key forms, in row order", () => {
    const rows = [{ name: "Web", total: 1 }, { id: null, name: "Phone", total: 2 }, { name: "Office", total: 3 }, { id: null, name: "Dealer", total: 4 }] as unknown as Line[];
    inLocale(<Table aria-label="Revenue" columns={COLUMNS} rows={rows} />);
    expect(bodyRows()).toEqual(["Web", "Phone", "Office", "Dealer"]);
    expect(idWarnings()).toHaveLength(1);
    expect(idWarnings()[0]).toContain(
      'rows have no id; pass rowKey. Every row still renders: each row is keyed by its position: undefined, "undefined#2", "undefined#3", … and null, "null#2", "null#3", …, and selection',
    );
  });

  it("id: null and missing ids together with a repeated id: one \"no id\" clause, the id listed alone", () => {
    const rows = [...DUPLICATE, { id: null, name: "Dealer", total: 4 }, { id: null, name: "Agency", total: 5 }, { name: "Office 2", total: 6 }, { name: "Office 3", total: 7 }] as unknown as Line[];
    inLocale(<Table aria-label="Revenue" columns={COLUMNS} rows={rows} />);
    expect(bodyRows()).toEqual(["Web", "Phone", "Office", "Dealer", "Agency", "Office 2", "Office 3"]);
    expect(idWarnings()).toHaveLength(1);
    expect(idWarnings()[0]).toContain('Table "Revenue": rows have no id; pass rowKey, and the row ids "a" repeat. ');
    expect(idWarnings()[0]).not.toMatch(/null|undefined/);
  });

  it("says both when some rows have no id and another id repeats", () => {
    const rows = [...DUPLICATE, { name: "Dealer", total: 4 }, { name: "Agency", total: 5 }] as Line[];
    inLocale(<Table aria-label="Revenue" columns={COLUMNS} rows={rows} />);
    expect(bodyRows()).toEqual(["Web", "Phone", "Office", "Dealer", "Agency"]);
    expect(idWarnings()).toHaveLength(1);
    expect(idWarnings()[0]).toContain('Table "Revenue": rows have no id; pass rowKey, and the row ids "a" repeat. ');
    expect(idWarnings()[0]).not.toContain("undefined");
    // A real id repeats, so the suffix wording stays.
    expect(idWarnings()[0]).toContain('keyed "<id>#2", "<id>#3", … in row order');
  });

  it("names ids that come from rowKey, numbers included", () => {
    inLocale(<Table aria-label="Revenue" columns={COLUMNS} rows={UNIQUE} rowKey={(row) => row.total % 2} />);
    expect(idWarnings()).toHaveLength(1);
    expect(idWarnings()[0]).toContain("row ids 1 repeat");
  });

  it("does not warn again for a set it reported; a new set warns again", () => {
    const { rerender } = inLocale(<Table aria-label="Revenue" columns={COLUMNS} rows={DUPLICATE} />);
    again(rerender, <Table aria-label="Revenue" columns={COLUMNS} rows={DUPLICATE} />);
    again(rerender, <Table aria-label="Revenue" columns={COLUMNS} rows={DUPLICATE.map((row) => ({ ...row }))} />);
    again(rerender, <Table aria-label="Revenue" columns={COLUMNS} rows={[...DUPLICATE, DEALER]} />);
    expect(idWarnings()).toHaveLength(1);

    again(rerender, <Table aria-label="Revenue" columns={COLUMNS} rows={[...UNIQUE, DEALER]} />);
    expect(idWarnings()).toHaveLength(2);
    expect(idWarnings()[1]).toContain('"c"');
    expect(idWarnings()[1]).not.toContain('"a"');

    again(rerender, <Table aria-label="Revenue" columns={COLUMNS} rows={UNIQUE} />);
    again(rerender, <Table aria-label="Revenue" columns={COLUMNS} rows={[...UNIQUE, DEALER]} />);
    expect(idWarnings()).toHaveLength(2);
  });

  it("with unique ids, and when empty, logs nothing", () => {
    inLocale(<Table aria-label="Revenue" columns={COLUMNS} rows={UNIQUE} />);
    expect(bodyRows()).toEqual(["Web", "Phone", "Office"]);
    cleanup();
    inLocale(<Table aria-label="Revenue" columns={COLUMNS} rows={[]} renderEmptyState={() => "No records"} />);
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it("with unique ids the rows keep their own ids as keys (onRowAction receives the id itself)", () => {
    const onRowAction = vi.fn();
    inLocale(<Table aria-label="Revenue" columns={COLUMNS} rows={UNIQUE} onRowAction={onRowAction} />);
    const row = screen.getAllByRole("row")[3]!;
    act(() => row.focus());
    fireEvent.keyDown(row, { key: "Enter" });
    fireEvent.keyUp(row, { key: "Enter" });
    expect(onRowAction).toHaveBeenCalledWith("c");
  });

  it("selection and onRowAction receive the suffixed key of a repeated row", () => {
    const onRowAction = vi.fn();
    const onSelectionChange = vi.fn();
    inLocale(
      <Table aria-label="Revenue" columns={COLUMNS} rows={DUPLICATE} onRowAction={onRowAction} selectionMode="multiple" onSelectionChange={onSelectionChange} />,
    );
    const rows = screen.getAllByRole("row").slice(1);
    act(() => rows[2]!.focus());
    fireEvent.keyDown(rows[2]!, { key: "Enter" });
    fireEvent.keyUp(rows[2]!, { key: "Enter" });
    expect(onRowAction).toHaveBeenCalledWith("a#2");
    fireEvent.click(within(rows[2]!).getByRole("checkbox"));
    expect([...(onSelectionChange.mock.lastCall![0] as Set<unknown>)]).toEqual(["a#2"]);
    fireEvent.click(within(rows[0]!).getByRole("checkbox"));
    expect([...(onSelectionChange.mock.lastCall![0] as Set<unknown>)].sort()).toEqual(["a", "a#2"]);
  });

  it("a real id that looks like a suffix keeps its own key", () => {
    const onRowAction = vi.fn();
    const rows: Line[] = [...DUPLICATE, { id: "a#2", name: "Dealer", total: 4 }];
    inLocale(<Table aria-label="Revenue" columns={COLUMNS} rows={rows} onRowAction={onRowAction} />);
    expect(bodyRows()).toEqual(["Web", "Phone", "Office", "Dealer"]);
    const [, , office, dealer] = screen.getAllByRole("row").slice(1);
    for (const row of [office!, dealer!]) {
      act(() => row.focus());
      fireEvent.keyDown(row, { key: "Enter" });
      fireEvent.keyUp(row, { key: "Enter" });
    }
    expect(onRowAction.mock.calls).toEqual([["a#3"], ["a#2"]]);
  });

  it("rows grown in place (the same array) still get a key each: the memo follows rows.length", () => {
    // A stable rowKey, as a caller hoists it: the default one is a new function each render, which hid this.
    const byId = (row: Line) => row.id;
    const onRowAction = vi.fn();
    const rows: Line[] = [...UNIQUE];
    const ui = () => <Table aria-label="Revenue" columns={COLUMNS} rows={rows} rowKey={byId} onRowAction={onRowAction} />;
    const { rerender } = inLocale(ui());
    rows.push({ id: "d", name: "Dealer", total: 4 }, { id: "a", name: "Agency", total: 5 });
    again(rerender, ui());
    expect(bodyRows()).toEqual(["Web", "Phone", "Office", "Dealer", "Agency"]);
    for (const row of screen.getAllByRole("row").slice(4)) {
      act(() => row.focus());
      fireEvent.keyDown(row, { key: "Enter" });
      fireEvent.keyUp(row, { key: "Enter" });
    }
    expect(onRowAction.mock.calls).toEqual([["d"], ["a#2"]]);
    expect(idWarnings()).toHaveLength(1);
    expect(idWarnings()[0]).toContain('"a"');
    rows.splice(3);
    again(rerender, ui());
    expect(bodyRows()).toEqual(["Web", "Phone", "Office"]);
  });

  it("a row replaced in place (same array, same length, stable rowKey) gets its new key", () => {
    const byId = (row: Line) => row.id;
    const onRowAction = vi.fn();
    const rows: Line[] = [...UNIQUE];
    const ui = () => <Table aria-label="Revenue" columns={COLUMNS} rows={rows} rowKey={byId} onRowAction={onRowAction} />;
    const { rerender } = inLocale(ui());
    const activateLast = () => {
      const row = screen.getAllByRole("row").at(-1)!;
      act(() => row.focus());
      fireEvent.keyDown(row, { key: "Enter" });
      fireEvent.keyUp(row, { key: "Enter" });
    };
    // c → a repeated id: the row is keyed a#2, not the stale "c".
    rows[2] = { id: "a", name: "Agency", total: 5 };
    again(rerender, ui());
    expect(bodyRows()).toEqual(["Web", "Phone", "Agency"]);
    activateLast();
    expect(idWarnings()).toHaveLength(1);
    expect(idWarnings()[0]).toContain('"a"');
    // a → d, unique again: the row is keyed d, not the stale "a#2".
    rows[2] = { id: "d", name: "Dealer", total: 4 };
    again(rerender, ui());
    expect(bodyRows()).toEqual(["Web", "Phone", "Dealer"]);
    activateLast();
    expect(onRowAction.mock.calls).toEqual([["a#2"], ["d"]]);
  });

  it("in production, logs nothing and still renders every row", () => {
    vi.stubEnv("NODE_ENV", "production");
    inLocale(<Table aria-label="Revenue" columns={COLUMNS} rows={DUPLICATE} />);
    expect(bodyRows()).toEqual(["Web", "Phone", "Office"]);
    expect(idWarnings()).toEqual([]);
  });

  it(
    "virtualized: every row, no freeze on update, the same single warning",
    () => {
      const { rerender } = inLocale(<TableView aria-label="Revenue" columns={COLUMNS} rows={UNIQUE} virtual={{ height: 300 }} />);
      again(rerender, <TableView aria-label="Revenue" columns={COLUMNS} rows={DUPLICATE} virtual={{ height: 300 }} />);
      expect(bodyRows()).toEqual(["Web", "Phone", "Office"]);
      again(rerender, <TableView aria-label="Revenue" columns={COLUMNS} rows={[...DUPLICATE, DEALER]} virtual={{ height: 300 }} />);
      expect(bodyRows()).toEqual(["Web", "Phone", "Office", "Dealer"]);
      expect(idWarnings()).toHaveLength(1);
      expect(idWarnings()[0]).toContain('"a"');
    },
    10_000,
  );
});

describe("DataTable with repeated row ids", () => {
  it("renders every row and warns once, naming the id and the table as a DataTable", () => {
    inLocale(<DataTable aria-label="Revenue channels" columns={DATA_COLUMNS} rows={DUPLICATE} />);
    expect(bodyRows()).toEqual(["Web", "Phone", "Office"]);
    expect(idWarnings()).toHaveLength(1);
    expect(idWarnings()[0]).toMatch(/^DataTable "Revenue channels": the row ids "a" repeat\. /);
  });

  it("says rows have no id, as a DataTable, when the rows lack one and there is no rowKey", () => {
    inLocale(<DataTable aria-label="Revenue" columns={PLAIN_COLUMNS as DataTableColumn<Plain>[]} rows={PLAIN} />);
    expect(bodyRows()).toEqual(["Web", "Phone", "Office"]);
    expect(idWarnings()).toHaveLength(1);
    expect(idWarnings()[0]).toMatch(/^DataTable "Revenue": rows have no id; pass rowKey\. /);
    expect(idWarnings()[0]).toContain('each row is keyed by its position: undefined, "undefined#2", "undefined#3", …');
    expect(idWarnings()[0]).not.toContain("<id>#2");
  });

  it("paged: each page renders its rows; a bulk action receives the suffixed key", async () => {
    const onAction = vi.fn();
    const rows: Line[] = [...DUPLICATE, DEALER, { id: "a", name: "Agency", total: 5 }];
    inLocale(<DataTable aria-label="Revenue" columns={DATA_COLUMNS} rows={rows} pageSize={3} bulkActions={[{ id: "x", label: "Export", onAction }]} />);
    expect(bodyRows()).toEqual(["Web", "Phone", "Office"]);
    fireEvent.click(within(screen.getAllByRole("row")[3]!).getByRole("checkbox"));
    expect(screen.getAllByRole("row")[3]!.getAttribute("aria-selected")).toBe("true");
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Export" })));
    expect(onAction).toHaveBeenCalledWith(["a#2"]);
    fireEvent.click(screen.getByRole("button", { name: /Next page/ }));
    expect(bodyRows()).toEqual(["Dealer", "Agency"]);
  });

  it(
    "virtualized (a long client list): every row, and an update that repeats an id completes",
    () => {
      const ui = (rows: Line[]) => <DataTable aria-label="Revenue" columns={DATA_COLUMNS} rows={rows} virtualizeAbove={1} height={300} />;
      const { rerender } = inLocale(ui(UNIQUE));
      expect(document.querySelector("[data-slot='table'][data-virtual]")).not.toBeNull();
      again(rerender, ui([...UNIQUE, DEALER]));
      expect(bodyRows()).toEqual(["Web", "Phone", "Office", "Dealer"]);
      expect(idWarnings()).toHaveLength(1);
      expect(idWarnings()[0]).toContain('"c"');
    },
    10_000,
  );

  it("a server list renders every row once its page arrives, and warns then, not while it loads", async () => {
    let resolve!: (result: { rows: Line[]; total: number }) => void;
    const query = () => new Promise<{ rows: Line[]; total: number }>((done) => (resolve = done));
    inLocale(<DataTable aria-label="Revenue" columns={DATA_COLUMNS} query={query} />);
    expect(idWarnings()).toEqual([]);
    await act(async () => resolve({ rows: DUPLICATE, total: 3 }));
    await waitFor(() => expect(idWarnings()).toHaveLength(1));
    expect(bodyRows()).toEqual(["Web", "Phone", "Office"]);
  });

  it("with unique ids, and in production, logs nothing", () => {
    inLocale(<DataTable aria-label="Revenue" columns={DATA_COLUMNS} rows={UNIQUE} />);
    expect(bodyRows()).toEqual(["Web", "Phone", "Office"]);
    expect(warn).not.toHaveBeenCalled();
    cleanup();
    vi.stubEnv("NODE_ENV", "production");
    inLocale(<DataTable aria-label="Revenue" columns={DATA_COLUMNS} rows={DUPLICATE} />);
    expect(bodyRows()).toEqual(["Web", "Phone", "Office"]);
    expect(idWarnings()).toEqual([]);
  });
});
