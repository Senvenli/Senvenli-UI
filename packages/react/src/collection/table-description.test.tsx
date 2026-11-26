import * as React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { DataTable, Table, type TableColumn } from "./index";

beforeAll(() => {
  globalThis.CSS ??= {} as typeof CSS;
  CSS.escape ??= (value: string) => value.replace(/[^\w-]/g, (char) => `\\${char}`);
});
afterEach(cleanup);

const inLocale = (ui: React.ReactElement) => render(<DesignSystemProvider locale="en" navigate={vi.fn()}>{ui}</DesignSystemProvider>);

type Site = { id: string; name: string; domain: string; plan: string };
const ROWS: Site[] = [
  { id: "s1", name: "Northwind", domain: "northwind.example.com", plan: "Pro" },
  { id: "s2", name: "Contoso", domain: "contoso.example.com", plan: "Basic" },
];
const COLUMNS: TableColumn<Site>[] = [
  { key: "name", header: "Site", description: (row) => row.domain },
  { key: "plan", header: "Plan" },
];

describe("Table column description", () => {
  it("puts a smaller, subtle second line under the value, in the same cell", () => {
    inLocale(<Table aria-label="Sites" columns={COLUMNS} rows={ROWS} />);
    const cell = screen.getByText("Northwind").closest('[data-slot="table-cell"]')!;
    const second = cell.querySelector('[data-slot="table-cell-description"]')!;
    expect(second.textContent).toBe("northwind.example.com");
    expect(second.className).toContain("text-body-small");
    expect(second.className).toContain("text-ds-text-subtle");
    // The value and its description are one cell: the row header reads both.
    expect(cell.textContent).toBe("Northwindnorthwind.example.com");
    // A column without one renders its value alone.
    expect(screen.getByText("Pro").closest('[data-slot="table-cell"]')!.querySelector('[data-slot="table-cell-stack"]')).toBeNull();
  });
});

describe("DataTable density", () => {
  it("is comfortable by default; compact stays on request", () => {
    inLocale(<DataTable aria-label="Sites" columns={COLUMNS} rows={ROWS} />);
    expect(document.querySelector('[data-slot="table"]')!.getAttribute("data-density")).toBe("comfortable");
    cleanup();
    inLocale(<DataTable aria-label="Sites" columns={COLUMNS} rows={ROWS} density="compact" />);
    expect(document.querySelector('[data-slot="table"]')!.getAttribute("data-density")).toBe("compact");
  });
});
