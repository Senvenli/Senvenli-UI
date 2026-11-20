import * as React from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { Key } from "react-aria-components";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { loadingLabel } from "../i18n";
import { ComboBox, type ComboBoxItem } from "./index";

/**
 * jsdom has no IntersectionObserver. This one remembers what is observed, and `reachEnd()` reports the
 * load-more sentinel as scrolled into view, as a user scrolling the list to its end does.
 */
const observers = new Set<TestIntersectionObserver>();
class TestIntersectionObserver {
  targets = new Set<Element>();
  constructor(private readonly callback: (entries: { isIntersecting: boolean; target: Element }[]) => void) {}
  observe(target: Element) {
    this.targets.add(target);
    observers.add(this);
  }
  unobserve(target: Element) {
    this.targets.delete(target);
  }
  disconnect() {
    this.targets.clear();
    observers.delete(this);
  }
  takeRecords() {
    return [];
  }
  fire() {
    this.callback([...this.targets].filter((target) => target.isConnected).map((target) => ({ isIntersecting: true, target })));
  }
}
function reachEnd() {
  act(() => {
    for (const observer of [...observers]) observer.fire();
  });
}

beforeAll(() => {
  Object.assign(globalThis, { IntersectionObserver: TestIntersectionObserver });
  globalThis.CSS ??= {} as typeof CSS;
  CSS.escape ??= (value: string) => value.replace(/[^\w-]/g, (char) => `\\${char}`);
});
afterEach(() => {
  cleanup();
  observers.clear();
  vi.useRealTimers();
});

function inLocale(ui: React.ReactElement, locale = "en") {
  return render(<DesignSystemProvider locale={locale} navigate={vi.fn()}>{ui}</DesignSystemProvider>);
}

const chevron = () => document.querySelector<HTMLElement>("[data-slot='combobox-button']")!;
const rows = () => [...document.querySelectorAll<HTMLElement>("[data-slot='combobox-option']")];
const rowLabels = () => rows().map((row) => row.querySelector("[data-slot='combobox-option-label']")!.textContent);
const loaderRow = () => document.querySelector<HTMLElement>("[data-slot='combobox-loading']");
const status = () => document.querySelector<HTMLElement>("[data-slot='combobox-loading-status']");

/** A catalog of items `from`…`to`, `SKU {i}` on the second line. */
const catalog = (from: number, to: number): ComboBoxItem[] =>
  Array.from({ length: to - from }, (_, index) => ({ id: `i${from + index}`, label: `Item ${from + index}`, description: `SKU ${from + index}` }));

/**
 * An app's record picker in small: the app owns the items, searches on the server 300ms after typing pauses,
 * and pages 10 at a time (an infinite query, here a promise the test settles by hand).
 */
function Picker({
  pageSize = 10, total = 30, fail, multiple, onFetch,
}: { pageSize?: number; total?: number; fail?: boolean; multiple?: boolean; onFetch?: (search: string, page: number) => void }) {
  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [pages, setPages] = React.useState(1);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [value, setValue] = React.useState<Key | null>(null);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(timer);
  }, [search]);
  React.useEffect(() => {
    setPages(1);
    onFetch?.(debounced, 1);
  }, [debounced]);
  // The server's answer: matches on the code too, which the label does not show.
  const matching = catalog(0, total).filter((item) => !debounced || `${item.label} ${item.description}`.includes(debounced) || debounced === "barcode");
  const items = matching.slice(0, pages * pageSize);
  const hasNextPage = items.length < matching.length;
  const fetchNextPage = () => {
    onFetch?.(debounced, pages + 1);
    setLoading(true);
    setError(null);
    pending.current = () => {
      setLoading(false);
      if (fail) setError("Could not load the items.");
      else setPages((count) => count + 1);
    };
  };
  const pending = React.useRef<(() => void) | null>(null);
  (Picker as unknown as { settle: () => void }).settle = () => {
    const done = pending.current;
    pending.current = null;
    act(() => done?.());
  };
  const common = {
    label: "Product",
    items,
    onSearchChange: setSearch,
    onLoadMore: hasNextPage ? fetchNextPage : undefined,
    isLoading: loading,
    errorMessage: error ?? undefined,
    isInvalid: Boolean(error) || undefined,
  };
  return multiple ? (
    <ComboBox selectionMode="multiple" {...common} />
  ) : (
    <ComboBox {...common} selectedKey={value} onSelectionChange={setValue} />
  );
}
const settle = () => (Picker as unknown as { settle: () => void }).settle();

describe("ComboBox paging with app-owned items: onLoadMore", () => {
  it("asks for the next page when the list is scrolled to its end, once until the app answers", () => {
    const onFetch = vi.fn();
    inLocale(<Picker onFetch={onFetch} />);
    fireEvent.click(chevron());
    expect(rowLabels()).toHaveLength(10);
    onFetch.mockClear();
    reachEnd();
    reachEnd();
    expect(onFetch).toHaveBeenCalledTimes(1);
    expect(onFetch).toHaveBeenLastCalledWith("", 2);
    // While loading: a loader row at the end (not an option arrows land on), the field's spinner, a polite announcement.
    expect(loaderRow()?.textContent).toBe(loadingLabel("en"));
    expect(document.querySelector("[data-slot='combobox-loading-spinner']")).not.toBeNull();
    expect(status()?.getAttribute("role")).toBe("status");
    expect(status()?.textContent).toBe(loadingLabel("en"));
    reachEnd();
    expect(onFetch).toHaveBeenCalledTimes(1);
    settle();
    expect(rowLabels()).toHaveLength(20);
    expect(loaderRow()).toBeNull();
    expect(status()?.textContent).toBe("");
    reachEnd();
    expect(onFetch).toHaveBeenCalledTimes(2);
    settle();
    expect(rowLabels()).toHaveLength(30);
    // The last page: the app passes no onLoadMore, so the list ends without a sentinel.
    expect(document.querySelector("[data-testid='loadMoreSentinel']")).toBeNull();
    reachEnd();
    expect(onFetch).toHaveBeenCalledTimes(2);
  });

  it("the keyboard walks the loaded rows and skips the loader row; Enter picks", () => {
    inLocale(<Picker />);
    const input = screen.getByRole("combobox");
    act(() => input.focus());
    fireEvent.click(chevron());
    reachEnd();
    expect(loaderRow()).not.toBeNull();
    for (let index = 0; index < 12; index += 1) fireEvent.keyDown(input, { key: "ArrowDown" });
    const active = document.getElementById(input.getAttribute("aria-activedescendant") ?? "");
    expect(active?.getAttribute("data-slot")).toBe("combobox-option");
    fireEvent.keyDown(input, { key: "Enter" });
    expect((input as HTMLInputElement).value).toMatch(/^Item \d+$/);
  });

  it("the app's error stays the app's: the row goes, the error shows, and the next scroll to the end asks again", () => {
    const onFetch = vi.fn();
    inLocale(<Picker fail onFetch={onFetch} />);
    fireEvent.click(chevron());
    onFetch.mockClear();
    reachEnd();
    settle();
    expect(loaderRow()).toBeNull();
    expect(document.querySelector("[data-slot='field-error']")?.textContent).toBe("Could not load the items.");
    expect(rowLabels()).toHaveLength(10);
    reachEnd();
    expect(onFetch).toHaveBeenCalledTimes(2);
  });

  it("several selections: the same paging", () => {
    const onFetch = vi.fn();
    inLocale(<Picker multiple onFetch={onFetch} />);
    fireEvent.click(chevron());
    onFetch.mockClear();
    reachEnd();
    reachEnd();
    expect(onFetch).toHaveBeenCalledTimes(1);
    settle();
    expect(rowLabels()).toHaveLength(20);
  });

  it("RTL: the loader row and the paging work the same", () => {
    const onFetch = vi.fn();
    inLocale(<div dir="rtl"><Picker onFetch={onFetch} /></div>, "ar");
    fireEvent.click(chevron());
    onFetch.mockClear();
    reachEnd();
    expect(onFetch).toHaveBeenCalledTimes(1);
    expect(loaderRow()?.textContent).toBe(loadingLabel("ar"));
  });

  it("with loadItems the field pages by itself: onLoadMore is not used", async () => {
    const onLoadMore = vi.fn();
    const loadItems = vi.fn(async () => ({ items: catalog(0, 3) }));
    inLocale(<ComboBox label="Product" loadItems={loadItems} onLoadMore={onLoadMore} menuTrigger="focus" />);
    await act(async () => {
      fireEvent.click(chevron());
    });
    reachEnd();
    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it("without onLoadMore nothing is added to the list (no sentinel)", () => {
    inLocale(<ComboBox label="Product" items={catalog(0, 5)} isLoading={false} />);
    fireEvent.click(chevron());
    expect(document.querySelector("[data-testid='loadMoreSentinel']")).toBeNull();
  });
});

describe("ComboBox server search with app-owned items: onSearchChange", () => {
  it("reports the typed text (never on mount), the app debounces it, and its results show as given", () => {
    vi.useFakeTimers();
    const onFetch = vi.fn();
    inLocale(<Picker onFetch={onFetch} />);
    expect(onFetch).toHaveBeenCalledTimes(1);
    expect(onFetch).toHaveBeenLastCalledWith("", 1);
    const input = screen.getByRole("combobox");
    act(() => input.focus());
    fireEvent.change(input, { target: { value: "S" } });
    fireEvent.change(input, { target: { value: "SKU" } });
    fireEvent.change(input, { target: { value: "SKU 2" } });
    act(() => vi.advanceTimersByTime(299));
    expect(onFetch).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(1));
    // One request after typing pauses, for the whole text.
    expect(onFetch).toHaveBeenCalledTimes(2);
    expect(onFetch).toHaveBeenLastCalledWith("SKU 2", 1);
    // The server matched the code, which no label holds: the rows are shown as the app gave them.
    expect(rowLabels()).toEqual(["Item 2", "Item 20", "Item 21", "Item 22", "Item 23", "Item 24", "Item 25", "Item 26", "Item 27", "Item 28"]);
    expect(within(screen.getByRole("listbox")).getAllByText("SKU 2", { selector: "mark" }).length).toBeGreaterThan(0);
  });

  it("the full list (chevron) searches for nothing, and a chosen item's label in the field is not a search", () => {
    const onSearchChange = vi.fn();
    function Field() {
      const [value, setValue] = React.useState<Key | null>(null);
      const [search, setSearch] = React.useState("");
      // The app's search, answered at once here.
      const items = catalog(0, 5).filter((item) => item.label.includes(search));
      return (
        <ComboBox
          label="Product"
          items={items}
          selectedKey={value}
          onSelectionChange={setValue}
          onSearchChange={(text) => {
            onSearchChange(text);
            setSearch(text);
          }}
        />
      );
    }
    inLocale(<Field />);
    const input = screen.getByRole("combobox") as HTMLInputElement;
    act(() => input.focus());
    fireEvent.change(input, { target: { value: "Item 3" } });
    expect(onSearchChange).toHaveBeenLastCalledWith("Item 3");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(input.value).toBe("Item 3");
    expect(onSearchChange).toHaveBeenLastCalledWith("");
    onSearchChange.mockClear();
    fireEvent.click(chevron());
    expect(onSearchChange).not.toHaveBeenCalled();
    expect(rowLabels()).toHaveLength(5);
  });

  it("a search resets the paging guard: the new results page again", () => {
    vi.useFakeTimers();
    const onFetch = vi.fn();
    inLocale(<Picker onFetch={onFetch} />);
    fireEvent.click(chevron());
    reachEnd();
    settle();
    const input = screen.getByRole("combobox");
    act(() => input.focus());
    fireEvent.change(input, { target: { value: "barcode" } });
    act(() => vi.advanceTimersByTime(300));
    expect(onFetch).toHaveBeenLastCalledWith("barcode", 1);
    expect(rowLabels()).toHaveLength(10);
    reachEnd();
    expect(onFetch).toHaveBeenLastCalledWith("barcode", 2);
  });

  it("without onSearchChange, app items are filtered here as before", () => {
    inLocale(<ComboBox label="Product" items={catalog(0, 30)} />);
    const input = screen.getByRole("combobox");
    act(() => input.focus());
    fireEvent.change(input, { target: { value: "Item 2" } });
    expect(rowLabels()).toEqual(["Item 2", "Item 20", "Item 21", "Item 22", "Item 23", "Item 24", "Item 25", "Item 26", "Item 27", "Item 28", "Item 29"]);
  });
});
