import * as React from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeAll, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { Toolbar } from "../layout/index";
import { Input } from "../form/index";
import { Select } from "./index";

beforeAll(() => {
  globalThis.CSS ??= {} as typeof CSS;
  CSS.escape ??= (value: string) => value.replace(/[^\w-]/g, (char) => `\\${char}`);
});
afterEach(cleanup);
const inLocale = (ui: React.ReactElement) => render(<DesignSystemProvider locale="en" navigate={vi.fn()}>{ui}</DesignSystemProvider>);
const ITEMS = [
  { id: "all", label: "All" },
  { id: "refunded", label: "Partially refunded" },
];

it("by default the field reserves every option label (and the placeholder), hidden, so its width never jumps", () => {
  inLocale(<Select aria-label="Status" items={ITEMS} defaultSelectedKey="all" />);
  const sizers = [...document.querySelectorAll('[data-slot="select-value-sizer"]')];
  expect(sizers.map((s) => s.getAttribute("data-text"))).toEqual(["Select", "All", "Partially refunded"]);
  for (const sizer of sizers) {
    expect(sizer.getAttribute("aria-hidden")).toBe("true");
    expect(sizer.className).toContain("invisible");
  }
  // The value itself is unchanged.
  expect(document.querySelector('[data-slot="select-value"]')!.textContent).toBe("All");
});

it("sizing value leaves the reservation out", () => {
  inLocale(<Select aria-label="Status" items={ITEMS} sizing="value" />);
  expect(document.querySelectorAll('[data-slot="select-value-sizer"]')).toHaveLength(0);
});

it("a Toolbar lets its search field grow first (up to 28rem) while filters keep their width", () => {
  inLocale(
    <Toolbar aria-label="Tools">
      <Input type="search" aria-label="Search" size="small" />
      <Select aria-label="Status" size="small" items={ITEMS} />
    </Toolbar>,
  );
  const toolbar = document.querySelector('[data-slot="toolbar"]')!;
  for (const cls of ["[&>[data-slot=search-field]]:grow-[100]", "[&>[data-slot=search-field]]:basis-48", "[&>[data-slot=search-field]]:max-w-[28rem]"]) {
    expect(toolbar.className).toContain(cls);
  }
});
