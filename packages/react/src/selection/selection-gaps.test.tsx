import * as React from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { loadingLabel } from "../i18n";
import { ComboBox, Select, type ComboBoxItem } from "./index";

afterEach(cleanup);

class TestIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
if (typeof globalThis.IntersectionObserver === "undefined") Object.assign(globalThis, { IntersectionObserver: TestIntersectionObserver });

if (typeof globalThis.CSS === "undefined" || typeof globalThis.CSS.escape !== "function") {
  Object.assign(globalThis, { CSS: { ...(globalThis.CSS ?? {}), escape: (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`) } });
}

function inLocale(ui: React.ReactElement, locale = "en") {
  return render(<DesignSystemProvider locale={locale} navigate={vi.fn()}>{ui}</DesignSystemProvider>);
}

function typeInto(input: HTMLElement, text: string) {
  act(() => input.focus());
  fireEvent.change(input, { target: { value: text } });
}

/** The accessible name: aria-labelledby ids (a self-reference reads the element's aria-label), else aria-label. */
function nameOf(element: Element) {
  const ids = element.getAttribute("aria-labelledby");
  if (!ids) return element.getAttribute("aria-label") ?? "";
  return ids
    .split(/\s+/)
    .map((id) => (id === element.id ? element.getAttribute("aria-label") : document.getElementById(id)?.textContent) ?? "")
    .join(" ")
    .trim();
}

const TEAMS = [
  { id: "des", label: "Design" },
  { id: "eng", label: "Engineering" },
];

describe("Select hidden label", () => {
  it("names the trigger from aria-label with no visible label", () => {
    for (const locale of ["en", "ar"]) {
      const { container } = inLocale(<div dir={locale === "ar" ? "rtl" : "ltr"}><Select aria-label="Team" items={TEAMS} /></div>, locale);
      const trigger = screen.getByRole("button");
      expect(nameOf(trigger), locale).toContain("Team");
      expect(container.querySelector("[data-slot=field-label]"), locale).toBeNull();
      cleanup();
    }
  });

  it("opens and selects by keyboard with only aria-label", () => {
    const onSelectionChange = vi.fn();
    inLocale(<Select aria-label="Team" items={TEAMS} onSelectionChange={onSelectionChange} />);
    const trigger = screen.getByRole("button");
    act(() => trigger.focus());
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    fireEvent.keyUp(trigger, { key: "ArrowDown" });
    const listbox = screen.getByRole("listbox");
    fireEvent.keyDown(document.activeElement ?? listbox, { key: "Enter" });
    fireEvent.keyUp(document.activeElement ?? listbox, { key: "Enter" });
    expect(onSelectionChange).toHaveBeenCalledWith("des");
  });

  it("keeps the visible label and its DOM when aria-label is omitted", () => {
    const { container } = inLocale(<Select label="Team" items={TEAMS} />);
    expect(container.querySelector("[data-slot=field-label]")?.textContent).toContain("Team");
    expect(nameOf(screen.getByRole("button"))).toContain("Team");
    expect(container.querySelector("[data-slot=select]")?.hasAttribute("aria-label")).toBe(false);
  });

  it("requires exactly one of label or aria-label (types)", () => {
    // @ts-expect-error neither is given
    void (<Select items={TEAMS} />);
    // @ts-expect-error both are given
    void (<Select label="Team" aria-label="Team" items={TEAMS} />);
    expect(true).toBe(true);
  });
});

const PRODUCTS: ComboBoxItem[] = [
  { id: "a", label: "Pro Monthly" },
  { id: "b", label: "Pro Yearly" },
  { id: "c", label: "Starter" },
];

describe("ComboBox isLoading", () => {
  it("renders no loading parts when isLoading is omitted", () => {
    const { container } = inLocale(<ComboBox label="Product" items={PRODUCTS} />);
    expect(container.querySelector("[data-slot=combobox-loading-status]")).toBeNull();
    expect(container.querySelector("[data-slot=combobox-loading-spinner]")).toBeNull();
  });

  it("announces loading through a mounted live region, with the localized default and a custom text", () => {
    const { container, rerender } = inLocale(<ComboBox label="Product" items={PRODUCTS} isLoading={false} />);
    const status = container.querySelector("[data-slot=combobox-loading-status]") as HTMLElement;
    expect(status.getAttribute("role")).toBe("status");
    expect(status.textContent).toBe("");
    expect(container.querySelector("[data-slot=combobox-loading-spinner]")).toBeNull();
    rerender(<DesignSystemProvider locale="en" navigate={vi.fn()}><ComboBox label="Product" items={PRODUCTS} isLoading /></DesignSystemProvider>);
    expect(container.querySelector("[data-slot=combobox-loading-status]")).toBe(status);
    expect(status.textContent).toBe(loadingLabel("en"));
    expect(container.querySelector("[data-slot=combobox-loading-spinner]")?.getAttribute("aria-hidden")).toBe("true");
    rerender(<DesignSystemProvider locale="en" navigate={vi.fn()}><ComboBox label="Product" items={PRODUCTS} isLoading loadingText="Loading products" /></DesignSystemProvider>);
    expect(status.textContent).toBe("Loading products");
  });

  it("shows a loader row in the list that arrows and Enter skip (also RTL)", () => {
    for (const locale of ["en", "ar"]) {
      const onSelectionChange = vi.fn();
      inLocale(
        <div dir={locale === "ar" ? "rtl" : "ltr"}>
          <ComboBox label="Product" items={PRODUCTS} isLoading onSelectionChange={onSelectionChange} />
        </div>,
        locale,
      );
      const input = screen.getByRole("combobox");
      typeInto(input, "pro");
      const listbox = screen.getByRole("listbox");
      const loader = listbox.querySelector("[data-slot=combobox-loading]");
      expect(loader?.textContent, locale).toContain(loadingLabel(locale));
      expect(within(listbox).getAllByRole("option").filter((option) => option.dataset.slot === "combobox-option")).toHaveLength(2);
      // Arrows past the last row never land on the loader row.
      let last: string | undefined;
      for (let index = 0; index < 3; index += 1) {
        fireEvent.keyDown(input, { key: "ArrowDown" });
        const active = document.getElementById(input.getAttribute("aria-activedescendant") ?? "");
        expect(active?.getAttribute("data-slot"), locale).toBe("combobox-option");
        last = active?.getAttribute("data-key") ?? undefined;
      }
      fireEvent.keyDown(input, { key: "ArrowUp" });
      const active = document.getElementById(input.getAttribute("aria-activedescendant") ?? "");
      expect(active?.getAttribute("data-slot"), locale).toBe("combobox-option");
      expect(active?.getAttribute("data-key"), locale).not.toBe(last);
      fireEvent.keyDown(input, { key: "Enter" });
      expect(onSelectionChange, locale).toHaveBeenCalledTimes(1);
      expect(onSelectionChange.mock.calls[0][0], locale).toBe(active?.getAttribute("data-key"));
      cleanup();
    }
    // Two full renders with an open popover: slow on a busy CI runner.
  }, 20_000);

  it("shows the loading text as the empty state when nothing is shown yet", () => {
    inLocale(<ComboBox label="Product" items={[]} isLoading loadingText="Loading products" menuTrigger="focus" />);
    const input = screen.getByRole("combobox");
    typeInto(input, "x");
    const listbox = screen.getByRole("listbox");
    expect(listbox.textContent).toContain("Loading products");
    expect(listbox.querySelector("[data-slot=combobox-loading]")).toBeNull();
  });

  it("works for multiple selection too", () => {
    const onSelectionChange = vi.fn();
    const { container } = inLocale(<ComboBox selectionMode="multiple" label="Products" items={PRODUCTS} isLoading onSelectionChange={onSelectionChange} />);
    expect(container.querySelector("[data-slot=combobox-loading-status]")?.textContent).toBe(loadingLabel("en"));
    const input = screen.getByRole("combobox");
    typeInto(input, "pro");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSelectionChange).toHaveBeenLastCalledWith(["a"]);
  });
});

describe("Select empty aria-label", () => {
  it('aria-label="" is treated as absent: no empty attribute, and a given label shows as usual', () => {
    const { container } = inLocale(<Select label="Team" items={TEAMS} />);
    const plain = container.innerHTML.replace(/_r_[0-9a-z]+_/g, "");
    cleanup();
    // Runtime only (the types forbid both): an empty aria-label beside a label.
    const loose = { label: "Team", "aria-label": "" } as unknown as { label: string };
    const { container: again } = inLocale(<Select {...loose} items={TEAMS} />);
    expect(again.querySelector("[aria-label='']")).toBeNull();
    expect(again.querySelector("[data-slot=field-label]")?.textContent).toContain("Team");
    expect(again.innerHTML.replace(/_r_[0-9a-z]+_/g, "")).toBe(plain);
  });

  it('aria-label="" alone renders no empty label node and no empty aria-label', () => {
    const { container } = inLocale(<Select aria-label="" items={TEAMS} />);
    expect(container.querySelector("[aria-label='']")).toBeNull();
    expect(container.querySelector("[data-slot=field-label]")).toBeNull();
  });
});

describe("ComboBox loading announcements", () => {
  it("a field that mounts already loading starts with an empty live region, then fills it", async () => {
    const { renderToString } = await import("react-dom/server");
    // The first render (what is committed before effects run) has the region empty…
    const html = renderToString(<DesignSystemProvider locale="en" navigate={vi.fn()}><ComboBox label="Product" items={PRODUCTS} isLoading /></DesignSystemProvider>);
    const first = document.createElement("div");
    first.innerHTML = html;
    const status = first.querySelector("[data-slot=combobox-loading-status]");
    expect(status?.getAttribute("role")).toBe("status");
    expect(status?.textContent).toBe("");
    // …and after mount it holds the text, so the change is announced.
    const { container } = inLocale(<ComboBox label="Product" items={PRODUCTS} isLoading />);
    expect(container.querySelector("[data-slot=combobox-loading-status]")?.textContent).toBe(loadingLabel("en"));
  });

  it("with loadItems, isLoading adds no second status region", async () => {
    const loadItems = vi.fn(() => new Promise<never>(() => {}));
    const { container } = inLocale(<ComboBox label="Product" loadItems={loadItems} isLoading />);
    await act(async () => {});
    expect(container.querySelector("[data-slot=combobox-loading-status]")).toBeNull();
    expect(container.querySelectorAll("[role=status]").length).toBeLessThanOrEqual(1);
    // The loadItems spinner is the one region while the first page loads.
    expect(container.querySelector("[data-slot=field-spinner]")?.getAttribute("role")).toBe("status");
    cleanup();
    // Multiple selection too.
    const { container: multiple } = inLocale(<ComboBox selectionMode="multiple" label="Products" loadItems={loadItems} isLoading />);
    await act(async () => {});
    expect(multiple.querySelectorAll("[role=status]")).toHaveLength(1);
  });

  it("with items only, isLoading keeps its own single status region", () => {
    const { container } = inLocale(<ComboBox label="Product" items={PRODUCTS} isLoading />);
    expect(container.querySelectorAll("[role=status]")).toHaveLength(1);
  });
});

describe("Select without an accessible name", () => {
  it('warns in development when aria-label="" and no label leave it unnamed', () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    inLocale(<Select aria-label="" items={TEAMS} />);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Select: no accessible name"));
    warn.mockClear();
    cleanup();
    inLocale(<Select aria-label="Team" items={TEAMS} />);
    inLocale(<Select label="Team" items={TEAMS} />);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

