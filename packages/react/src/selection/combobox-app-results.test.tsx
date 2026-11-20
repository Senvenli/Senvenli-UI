import * as React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { Key } from "react-aria-components";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { loadingLabel } from "../i18n";
import { APP_RESULTS_QUIET_MS } from "./combobox";
import { ComboBox, type ComboBoxItem } from "./index";

/** jsdom has no IntersectionObserver; the paging sentinel only needs one to exist. */
class QuietObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
beforeAll(() => {
  Object.assign(globalThis, { IntersectionObserver: QuietObserver });
  globalThis.CSS ??= {} as typeof CSS;
  CSS.escape ??= (value: string) => value.replace(/[^\w-]/g, (char) => `\\${char}`);
});
beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function inLocale(ui: React.ReactElement, locale = "en") {
  return render(<DesignSystemProvider locale={locale} navigate={vi.fn()}>{ui}</DesignSystemProvider>);
}

const rows = () => [...document.querySelectorAll<HTMLElement>("[data-slot='combobox-option']")];
const rowLabels = () => rows().map((row) => row.querySelector("[data-slot='combobox-option-label']")!.textContent);
const empty = () => document.querySelector<HTMLElement>("[data-slot='combobox-empty']");
const status = () => document.querySelector<HTMLElement>("[data-slot='combobox-loading-status']");
const fieldSpinner = () => document.querySelector("[data-slot='combobox-loading-spinner']");
const input = () => screen.getByRole("combobox") as HTMLInputElement;
/**
 * Time passes in 10ms steps, each its own act(): React renders between them, as a browser does. (One act() over a long
 * span would hold every render the timers cause until its end.)
 */
function tick(ms: number) {
  for (let left = ms; left > 0; left -= 10) act(() => vi.advanceTimersByTime(Math.min(10, left)));
}
function typeText(text: string) {
  act(() => input().focus());
  fireEvent.change(input(), { target: { value: text } });
}

const CATALOG: ComboBoxItem[] = [
  { id: "desk", label: "Walnut Desk", description: "SKU 101 AB" },
  { id: "chair", label: "Steel Chair", description: "SKU 102 AB" },
  { id: "rug", label: "Wool Rug", description: "SKU 103 AB" },
  { id: "vase", label: "Glass Vase", description: "SKU 104 AB" },
];
const ALL = CATALOG.map((item) => item.label);

/**
 * The app's server search: it stores the text at once (`onSearchChange={setSearch}`), searches 300ms after typing pauses
 * and answers `latency` ms later; `items` is derived in render (a new array every render), as an app with a query library does.
 * `isLoading` is set from the request to the answer when `reportsLoading`; `answer` can make the server return any rows.
 */
function AppSearch({
  latency = 0, reportsLoading = false, multiple = false, memo = false, answer, onCreate, onLoadMore,
}: {
  latency?: number; reportsLoading?: boolean; multiple?: boolean; memo?: boolean;
  answer?: (search: string) => ComboBoxItem[]; onCreate?: (text: string) => void; onLoadMore?: () => void;
}) {
  const [search, setSearch] = React.useState("");
  const [found, setFound] = React.useState(CATALOG);
  const [loading, setLoading] = React.useState(false);
  const [value, setValue] = React.useState<Key | null>(null);
  const [values, setValues] = React.useState<Key[]>([]);
  React.useEffect(() => {
    const reply = () => {
      setFound(answer ? answer(search) : CATALOG.filter((item) => `${item.label} ${item.description}`.toLowerCase().includes(search.toLowerCase())));
      setLoading(false);
    };
    const debounce = setTimeout(() => {
      if (reportsLoading) setLoading(true);
      // A server that answers at once (a cache) or after `latency` ms.
      if (latency === 0) return reply();
      const timer = setTimeout(reply, latency);
      cleanupReply.current = () => clearTimeout(timer);
    }, 300);
    const cleanupReply = { current: () => {} };
    return () => {
      clearTimeout(debounce);
      cleanupReply.current();
    };
  }, [search]);
  const memoized = React.useMemo(() => [...found], [found]);
  const items = memo ? memoized : [...found];
  const common = { label: "Product", items, onSearchChange: setSearch, isLoading: reportsLoading ? loading : undefined, onCreate, onLoadMore };
  return multiple ? (
    <ComboBox selectionMode="multiple" {...common} selectedKeys={values} onSelectionChange={setValues} />
  ) : (
    <ComboBox {...common} selectedKey={value} onSelectionChange={setValue} />
  );
}

describe("ComboBox with the app's own search hides rows found for another text", () => {
  it("from the keystroke to the answer: no stale rows, never the full list, the loading row and a polite status instead", () => {
    inLocale(<AppSearch latency={200} />);
    typeText("rug");
    const seen: number[] = [];
    for (let elapsed = 0; elapsed < 500; elapsed += 50) {
      seen.push(rows().length);
      expect(rowLabels()).toEqual([]);
      expect(empty()?.textContent).toBe(loadingLabel("en"));
      expect(status()?.getAttribute("role")).toBe("status");
      expect(status()?.textContent).toBe(loadingLabel("en"));
      expect(fieldSpinner()).not.toBeNull();
      tick(50);
    }
    expect(seen.every((count) => count === 0)).toBe(true);
    expect(rowLabels()).toEqual(["Wool Rug"]);
    expect(status()?.textContent).toBe("");
    expect(fieldSpinner()).toBeNull();
  });

  it("each keystroke hides again until its own answer; the app storing the text is not an answer", () => {
    inLocale(<AppSearch />);
    typeText("w");
    tick(300);
    expect(rowLabels()).toEqual(["Walnut Desk", "Wool Rug"]);
    typeText("wal");
    expect(rowLabels()).toEqual([]);
    tick(299);
    expect(rowLabels()).toEqual([]);
    tick(1);
    expect(rowLabels()).toEqual(["Walnut Desk"]);
  });

  it("the server answers with the same rows and reports loading: they show when isLoading is cleared", () => {
    inLocale(<AppSearch reportsLoading latency={200} answer={() => [...CATALOG]} />);
    typeText("sku");
    tick(300);
    expect(rowLabels()).toEqual([]);
    tick(199);
    expect(rowLabels()).toEqual([]);
    tick(1);
    expect(rowLabels()).toEqual(ALL);
  });

  it("the server answers with the same rows and reports nothing: they show once nothing has changed for a while", () => {
    inLocale(<AppSearch latency={100} answer={() => [...CATALOG]} />);
    typeText("sku");
    // The app's re-renders (the stored text, the debounce, the answer) each start the wait again.
    tick(400 + APP_RESULTS_QUIET_MS - 50);
    expect(rowLabels()).toEqual([]);
    tick(100);
    expect(rowLabels()).toEqual(ALL);
  });

  it("the same rows from a memoized array show the same way", () => {
    inLocale(<AppSearch memo answer={() => [...CATALOG]} />);
    typeText("sku");
    tick(300 + APP_RESULTS_QUIET_MS - 50);
    expect(rowLabels()).toEqual([]);
    tick(100);
    expect(rowLabels()).toEqual(ALL);
  });

  it("clearing the text hides the filtered rows until the full list arrives", () => {
    inLocale(<AppSearch />);
    typeText("chair");
    tick(300);
    expect(rowLabels()).toEqual(["Steel Chair"]);
    typeText("");
    // The list stays open on the loading row: not the filtered row, and not yet the full list.
    expect(screen.getByRole("listbox")).not.toBeNull();
    expect(rowLabels()).toEqual([]);
    expect(empty()?.textContent).toBe(loadingLabel("en"));
    expect(status()?.textContent).toBe(loadingLabel("en"));
    tick(300);
    expect(rowLabels()).toEqual(ALL);
  });

  it("the keyboard never lands on a hidden row; after the answer, arrows and Enter pick from it", () => {
    inLocale(<AppSearch />);
    typeText("glass");
    fireEvent.keyDown(input(), { key: "ArrowDown" });
    expect(input().getAttribute("aria-activedescendant")).toBeNull();
    fireEvent.keyDown(input(), { key: "Enter" });
    expect(input().value).toBe("glass");
    tick(300);
    fireEvent.keyDown(input(), { key: "ArrowDown" });
    fireEvent.keyDown(input(), { key: "Enter" });
    expect(input().value).toBe("Glass Vase");
  });

  it("no create row and no paging while the answer is on its way", () => {
    const onLoadMore = vi.fn();
    inLocale(<AppSearch onCreate={vi.fn()} onLoadMore={onLoadMore} />);
    typeText("Lamp");
    expect(document.querySelector("[data-slot='combobox-create']")).toBeNull();
    expect(document.querySelector("[data-slot='combobox-loading']")).toBeNull();
    tick(300);
    expect(document.querySelector("[data-slot='combobox-create']")).not.toBeNull();
  });

  it("several selections: the same", () => {
    inLocale(<AppSearch multiple />);
    typeText("chair");
    expect(rowLabels()).toEqual([]);
    expect(empty()?.textContent).toBe(loadingLabel("en"));
    tick(300);
    expect(rowLabels()).toEqual(["Steel Chair"]);
  });

  it("RTL (ar): the same", () => {
    inLocale(<div dir="rtl"><AppSearch /></div>, "ar");
    typeText("rug");
    expect(rowLabels()).toEqual([]);
    expect(empty()?.textContent).toBe(loadingLabel("ar"));
    tick(300);
    expect(rowLabels()).toEqual(["Wool Rug"]);
  });
});

describe("the quiet wait ends with the field", () => {
  it("unmounting while the same rows wait clears the timer: nothing runs and nothing renders afterwards", () => {
    // Each quiet-time callback is wrapped so the test sees whether it ever runs.
    const realSetTimeout = globalThis.setTimeout;
    const ran: number[] = [];
    const setTimer = vi.spyOn(globalThis, "setTimeout").mockImplementation(((callback: () => void, ms?: number) => {
      if (ms !== APP_RESULTS_QUIET_MS) return realSetTimeout(callback, ms);
      const index = setTimer.mock.calls.length;
      return realSetTimeout(() => {
        ran.push(index);
        callback();
      }, ms);
    }) as typeof setTimeout);
    const clearTimer = vi.spyOn(globalThis, "clearTimeout");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const { unmount } = inLocale(<AppSearch answer={() => [...CATALOG]} />);
    typeText("sku");
    tick(300);
    // The same rows came back with no loading said: hidden, waiting for the quiet time.
    expect(rowLabels()).toEqual([]);
    const quiet = setTimer.mock.results
      .filter((_, call) => setTimer.mock.calls[call][1] === APP_RESULTS_QUIET_MS)
      .map((result) => result.value as ReturnType<typeof setTimeout>);
    expect(quiet.length).toBeGreaterThan(0);
    const pending = quiet.at(-1)!;
    unmount();
    expect(clearTimer).toHaveBeenCalledWith(pending);
    const ranBefore = ran.length;
    tick(APP_RESULTS_QUIET_MS * 2);
    expect(ran.length).toBe(ranBefore);
    expect(consoleError).not.toHaveBeenCalled();
    expect(document.querySelector("[data-slot='combobox-option']")).toBeNull();
    setTimer.mockRestore();
    clearTimer.mockRestore();
    consoleError.mockRestore();
  });
});

describe("the other paths are untouched", () => {
  it("the local filter answers on the keystroke", () => {
    inLocale(<ComboBox label="Product" items={CATALOG} />);
    typeText("rug");
    expect(rowLabels()).toEqual(["Wool Rug"]);
  });

  it("loadItems shows its own loading and then its page", async () => {
    const loadItems = vi.fn(async (text: string) => ({ items: CATALOG.filter((item) => item.label.toLowerCase().includes(text.toLowerCase())) }));
    inLocale(<ComboBox label="Product" loadItems={loadItems} />);
    await act(async () => {
      typeText("chair");
    });
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(rowLabels()).toEqual(["Steel Chair"]);
    expect(status()).toBeNull();
  });
});
