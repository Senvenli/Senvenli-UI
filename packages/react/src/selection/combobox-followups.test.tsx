import * as React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { ComboBox, type ComboBoxItem } from "./index";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

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
  return render(
    <div dir={locale === "ar" ? "rtl" : "ltr"}>
      <DesignSystemProvider locale={locale} navigate={vi.fn()}>{ui}</DesignSystemProvider>
    </div>,
  );
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

const PRODUCTS: ComboBoxItem[] = [
  { id: "chair", label: "Steel Chair", description: "SKU 123 AB" },
  { id: "desk", label: "Walnut Desk" },
];

const strip = (html: string) => html.replace(/_r_[0-9a-z]+_/g, "");

/** The warnings about a missing name: ours and React Aria's own. */
function nameWarnings(warn: { mock: { calls: unknown[][] } }) {
  return warn.mock.calls.map((call: unknown[]) => String(call[0])).filter((text: string) => /accessible name|aria-label|visible label/i.test(text));
}

const MODES = [
  { mode: "single", render: (props: Record<string, unknown>) => <ComboBox {...(props as { label: string })} items={PRODUCTS} /> },
  { mode: "multiple", render: (props: Record<string, unknown>) => <ComboBox selectionMode="multiple" {...(props as { label: string })} items={PRODUCTS} /> },
] as const;

describe("ComboBox hidden label", () => {
  it("aria-label alone names the input, renders no visible label and warns about nothing", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    for (const { mode, render: field } of MODES) {
      for (const locale of ["en", "ar"]) {
        const { container } = inLocale(field({ "aria-label": "Product" }), locale);
        const input = screen.getByRole("combobox");
        expect(nameOf(input), `${mode} ${locale}`).toBe("Product");
        expect(container.querySelector("[data-slot=field-label]"), `${mode} ${locale}`).toBeNull();
        expect(container.querySelector("label"), `${mode} ${locale}`).toBeNull();
        cleanup();
      }
    }
    expect(nameWarnings(warn)).toEqual([]);
  });

  it("opens and keeps a named list (React Aria's own list name, as for any aria-labelled combobox)", async () => {
    for (const { mode, render: field } of MODES) {
      inLocale(field({ "aria-label": "Product" }));
      const button = document.querySelector<HTMLElement>("[data-slot=combobox-button]")!;
      await act(async () => {
        fireEvent.pointerDown(button, { pointerType: "mouse", button: 0 });
        fireEvent.pointerUp(button, { pointerType: "mouse", button: 0 });
        fireEvent.click(button);
      });
      const listbox = screen.getByRole("listbox");
      expect(nameOf(listbox), mode).not.toBe("");
      expect(screen.getByRole("combobox").getAttribute("aria-controls"), mode).toBe(listbox.id);
      cleanup();
    }
  });

  it("a visible label is unchanged: wired by aria-labelledby, no aria-label on the input", () => {
    for (const { mode, render: field } of MODES) {
      const { container } = inLocale(field({ label: "Product" }));
      const input = screen.getByRole("combobox");
      expect(input.hasAttribute("aria-label"), mode).toBe(false);
      expect(nameOf(input), mode).toBe("Product");
      expect(container.querySelector("[data-slot=field-label]")?.textContent, mode).toBe("Product");
      cleanup();
    }
  });

  it('aria-label="" counts as absent: beside a label the DOM is the plain labelled one', () => {
    for (const { mode, render: field } of MODES) {
      const { container } = inLocale(field({ label: "Product" }));
      const plain = strip(container.innerHTML);
      cleanup();
      // Runtime only (the types forbid both): an empty aria-label beside a label.
      const { container: again } = inLocale(field({ label: "Product", "aria-label": "" }));
      expect(again.querySelector("[aria-label='']"), mode).toBeNull();
      expect(strip(again.innerHTML), mode).toBe(plain);
      cleanup();
    }
  });

  it('aria-label="" alone renders no empty attribute and no label node, and warns in development', () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    for (const { mode, render: field } of MODES) {
      const { container } = inLocale(field({ "aria-label": "" }));
      expect(container.querySelector("[aria-label='']"), mode).toBeNull();
      expect(container.querySelector("[data-slot=field-label]"), mode).toBeNull();
      expect(warn, mode).toHaveBeenCalledWith(expect.stringContaining("ComboBox: no accessible name"));
      warn.mockClear();
      cleanup();
    }
  });

  it("warns once per unnamed field, never for a labelled, aria-labelled or aria-labelledby field", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    for (const { render: field } of MODES) {
      inLocale(field({ label: "Product" }));
      inLocale(field({ "aria-label": "Product" }));
      inLocale(
        <>
          <span id="products-heading">Products</span>
          {field({ "aria-labelledby": "products-heading" })}
        </>,
      );
    }
    expect(warn.mock.calls.filter((call) => String(call[0]).startsWith("ComboBox:"))).toEqual([]);
  });

  it("an aria-labelled field still selects by keyboard", async () => {
    const onSelectionChange = vi.fn();
    inLocale(<ComboBox aria-label="Product" items={PRODUCTS} onSelectionChange={onSelectionChange} />);
    const input = screen.getByRole("combobox");
    act(() => input.focus());
    fireEvent.change(input, { target: { value: "desk" } });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSelectionChange).toHaveBeenLastCalledWith("desk");
  });
});
