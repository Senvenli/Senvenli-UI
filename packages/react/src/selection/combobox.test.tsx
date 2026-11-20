import fs from "node:fs";
import * as React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Dialog, Modal } from "react-aria-components";
import { createTheme, toCSS } from "@senvenli/tokens";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { DS_STRINGS, clearAllLabel, createItemLabel, loadingLabel, noMatchLabel, registerDsStrings, showSuggestionsLabel } from "../i18n";
import { Autocomplete, ComboBox, TagGroup, type ComboBoxItem } from "./index";
import { Highlight, foldText, matchRange, matchesQuery } from "./match";
import { TAG_ITEM, TAG_REMOVE_BUTTON } from "./tag-group";

afterEach(cleanup);

// jsdom has no IntersectionObserver. This one reports every observed element as visible when
// `intersectAll` is on, so React Aria's load-more sentinel can be exercised.
let intersectAll = false;
class TestIntersectionObserver {
  constructor(private readonly callback: (entries: { isIntersecting: boolean; target: Element }[]) => void) {}
  observe(target: Element) {
    if (intersectAll) queueMicrotask(() => this.callback([{ isIntersecting: true, target }]));
  }
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
Object.assign(globalThis, { IntersectionObserver: TestIntersectionObserver });

if (typeof globalThis.CSS === "undefined" || typeof globalThis.CSS.escape !== "function") {
  Object.assign(globalThis, { CSS: { ...(globalThis.CSS ?? {}), escape: (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`) } });
}

// A helper, not an inline `new URL("…", import.meta.url)`: Vite rewrites that literal form into an asset URL.
const here = (file: string) => new URL(file, import.meta.url);
const theme = toCSS(createTheme(), { tailwind: true }) + fs.readFileSync(here("../../styles/theme.css"), "utf8");
const PHYSICAL = /(^|\s|:)(-?m[lr]-|p[lr]-|left-|right-|border-[lr](-|\s|$)|rounded-[lr]-|text-left|text-right)/;
const classesOf = (element: Element | null) => element?.getAttribute("class") ?? "";

function inLocale(ui: React.ReactElement, locale = "en") {
  return render(<DesignSystemProvider locale={locale} navigate={vi.fn()}>{ui}</DesignSystemProvider>);
}

function press(element: Element) {
  const pointer = { pointerType: "mouse", pointerId: 1, detail: 1, buttons: 1, width: 1, height: 1 };
  fireEvent.pointerDown(element, pointer);
  fireEvent.mouseDown(element, { detail: 1, buttons: 1 });
  fireEvent.pointerUp(element, { ...pointer, buttons: 0 });
  fireEvent.mouseUp(element, { detail: 1 });
  fireEvent.click(element, { detail: 1 });
}

/** Types into the field the way a user does: focus, then each change. */
function typeInto(input: HTMLElement, text: string) {
  act(() => input.focus());
  fireEvent.change(input, { target: { value: text } });
}

const PRODUCTS: ComboBoxItem[] = [
  { id: "a", label: "Desk Lamp · Black", description: "SKU AB 482" },
  { id: "b", label: "Desk Lamp · White", description: "SKU KM 310" },
  { id: "c", label: "Desk Lamp Stand", description: "SKU TV 41", isDisabled: true },
  { id: "d", label: "Café Table", description: "SKU BD 12" },
];

// React Aria wraps the empty state in role="option" (display: contents); it is not a result row.
const options = () =>
  screen.queryAllByRole("option").filter((option) => !option.querySelector('[data-slot="combobox-empty"], [data-slot="autocomplete-loading"]'));
// React Aria hides everything outside an open popover from the accessibility tree; reach the chevron by its slot.
const chevron = (index = 0) => document.querySelectorAll<HTMLElement>('[data-slot="combobox-button"]')[index];
const optionName = (option: HTMLElement) =>
  (option.getAttribute("aria-labelledby") ?? "").split(" ").map((id) => document.getElementById(id)?.textContent ?? "").join(" ").trim();

describe("matching", () => {
  it("is case- and diacritic-insensitive, also for letters that do not decompose", () => {
    expect(matchesQuery("durovic", "Ana Đurović")).toBe(true);
    expect(matchesQuery("istanbul", "İstanbul Sabiha Gökçen")).toBe(true);
    expect(matchesQuery("ISTANBUL", "istanbul")).toBe(true);
    expect(matchesQuery("cafe", "Café Table")).toBe(true);
    expect(matchesQuery("sahin", "Elif Şahin")).toBe(true);
    expect(matchesQuery("zzzz", "Montenegro")).toBe(false);
  });

  it("bolds the right letters after emoji and inside expanded letters", () => {
    render(
      <p>
        <Highlight text="🇹🇷 Türkiye" query="turk" />|<Highlight text="Straße" query="stras" />
      </p>,
    );
    expect(Array.from(document.querySelectorAll('[data-slot="match"]')).map((mark) => mark.textContent)).toEqual(["Türk", "Straß"]);
  });

  it("finds the match anywhere and maps it back to the original letters", () => {
    expect(matchRange("Ana Đurović", "urov")).toEqual([5, 9]);
    expect("Ana Đurović".slice(...matchRange("Ana Đurović", "đurović")!)).toBe("Đurović");
    expect(foldText("İz").folded).toBe("iz");
  });
});

describe("ComboBox", () => {
  it("is named by its label and filters anywhere in the label and the secondary line", () => {
    inLocale(<ComboBox label="Product" items={PRODUCTS} />);
    const input = screen.getByRole("combobox", { name: "Product" });
    typeInto(input, "km 310");
    expect(options().map(optionName)).toEqual(["Desk Lamp · White"]);
    typeInto(input, "lamp");
    expect(options().map(optionName)).toEqual(["Desk Lamp · Black", "Desk Lamp · White", "Desk Lamp Stand"]);
    expect(options()[0].querySelector('[data-slot="match"]')?.textContent).toBe("Lamp");
  });

  it("names options by their label only and describes them with the second line", () => {
    inLocale(<ComboBox label="Product" items={PRODUCTS} />);
    typeInto(screen.getByRole("combobox"), "table");
    const [option] = options();
    expect(optionName(option)).toBe("Café Table");
    expect(document.getElementById(option.getAttribute("aria-describedby") ?? "")?.textContent).toBe("SKU BD 12");
  });

  it("selects an option, exposes aria-selected and shows its label", () => {
    const onSelectionChange = vi.fn();
    inLocale(<ComboBox label="Product" items={PRODUCTS} onSelectionChange={onSelectionChange} />);
    const input = screen.getByRole("combobox") as HTMLInputElement;
    typeInto(input, "white");
    press(options()[0]);
    expect(onSelectionChange).toHaveBeenLastCalledWith("b");
    expect(input.value).toBe("Desk Lamp · White");
    press(chevron());
    const chosen = options().find((option) => optionName(option) === "Desk Lamp · White")!;
    expect(chosen.getAttribute("aria-selected")).toBe("true");
  });

  it("choosing the current option again keeps the value", () => {
    const onSelectionChange = vi.fn();
    inLocale(<ComboBox label="Product" items={PRODUCTS} defaultSelectedKey="a" onSelectionChange={onSelectionChange} />);
    const input = screen.getByRole("combobox") as HTMLInputElement;
    press(chevron());
    press(options().find((option) => optionName(option) === "Desk Lamp · Black")!);
    expect(onSelectionChange).not.toHaveBeenCalledWith(null);
    expect(input.value).toBe("Desk Lamp · Black");
  });

  it("clears the value only when the text is cleared, once", () => {
    const onSelectionChange = vi.fn();
    inLocale(<ComboBox label="Product" items={PRODUCTS} defaultSelectedKey="a" onSelectionChange={onSelectionChange} />);
    typeInto(screen.getByRole("combobox"), "Desk Lamp");
    expect(onSelectionChange).not.toHaveBeenCalled();
    typeInto(screen.getByRole("combobox"), "");
    expect(onSelectionChange).toHaveBeenCalledTimes(1);
    expect(onSelectionChange).toHaveBeenLastCalledWith(null);
  });

  it("skips a disabled option and never selects it", () => {
    const onSelectionChange = vi.fn();
    inLocale(<ComboBox label="Product" items={PRODUCTS} onSelectionChange={onSelectionChange} />);
    typeInto(screen.getByRole("combobox"), "stand");
    const [variant] = options();
    expect(variant.getAttribute("aria-disabled")).toBe("true");
    press(variant);
    expect(onSelectionChange).not.toHaveBeenCalled();
  });

  it("nonsense shows the empty message, not leftover rows", () => {
    inLocale(<ComboBox label="Product" items={PRODUCTS} />);
    typeInto(screen.getByRole("combobox"), "zzzz");
    expect(options()).toHaveLength(0);
    expect(document.querySelector('[data-slot="combobox-empty"]')?.textContent).toBe(DS_STRINGS.noMatch.en.replace("{query}", "zzzz"));
  });

  it("offers a create row for new text and calls onCreate with it", () => {
    const onCreate = vi.fn();
    const onSelectionChange = vi.fn();
    inLocale(<ComboBox label="Product" items={PRODUCTS} onCreate={onCreate} onSelectionChange={onSelectionChange} />);
    typeInto(screen.getByRole("combobox"), "stool");
    const create = document.querySelector('[data-slot="combobox-create"]') as HTMLElement;
    expect(create.textContent).toContain(DS_STRINGS.createItem.en.replace("{query}", "stool"));
    press(create);
    expect(onCreate).toHaveBeenCalledWith("stool");
    expect(onSelectionChange).not.toHaveBeenCalled();
  });

  it("opens the full list from the chevron even after a choice", () => {
    inLocale(<ComboBox label="Product" items={PRODUCTS} defaultSelectedKey="d" />);
    press(chevron());
    expect(options()).toHaveLength(PRODUCTS.length);
  });

  it("shows the label of a chosen item that is not on the loaded page", async () => {
    const loadItems = vi.fn(async () => ({ items: [{ id: "me", label: "Montenegro" }] }));
    inLocale(<ComboBox label="Country" loadItems={loadItems} selectedKey="li" selectedItem={{ id: "li", label: "Liechtenstein" }} />);
    expect((screen.getByRole("combobox") as HTMLInputElement).value).toBe("Liechtenstein");
    await waitFor(() => expect(loadItems).toHaveBeenCalled());
  });

  it("searches on the server with the typed text and offers more when a cursor comes back", async () => {
    const loadItems = vi.fn(async (text: string) => ({
      items: ["Canada", "Cambodia", "Cameroon"].filter((name) => name.toLowerCase().startsWith(text.toLowerCase())).map((name) => ({ id: name, label: name })),
      cursor: text === "ca" ? "page-2" : undefined,
    }));
    inLocale(<ComboBox label="Country" loadItems={loadItems} />);
    typeInto(screen.getByRole("combobox"), "ca");
    await waitFor(() => expect(loadItems).toHaveBeenLastCalledWith("ca", undefined, expect.any(AbortSignal)));
    await waitFor(() => expect(options().map(optionName)).toEqual(["Canada", "Cambodia", "Cameroon"]));
    // React Aria's load-more sentinel is in the list while the server says there is more.
    expect(screen.getByRole("listbox").querySelector('[data-testid="loadMoreSentinel"]')).not.toBeNull();
    typeInto(screen.getByRole("combobox"), "zzzz");
    await waitFor(() => expect(document.querySelector('[data-slot="combobox-empty"]')?.textContent).toBe(DS_STRINGS.noMatch.en.replace("{query}", "zzzz")));
    expect(options()).toHaveLength(0);
  });

  it("works inside a Dialog: the list opens, a choice lands and focus stays in the field", () => {
    const onSelectionChange = vi.fn();
    inLocale(
      <Modal isOpen>
        <Dialog aria-label="Order">
          <ComboBox label="Product" items={PRODUCTS} onSelectionChange={onSelectionChange} />
        </Dialog>
      </Modal>,
    );
    const input = screen.getByRole("combobox");
    typeInto(input, "table");
    expect(screen.getByRole("dialog").contains(input)).toBe(true);
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSelectionChange).toHaveBeenLastCalledWith("d");
    expect(document.activeElement).toBe(input);
  });

  it("moves with the keyboard, skips a disabled option and selects with Enter (also right-to-left)", () => {
    for (const locale of ["en", "ar"]) {
      const onSelectionChange = vi.fn();
      inLocale(<div dir={locale === "ar" ? "rtl" : "ltr"}><ComboBox label="Product" items={PRODUCTS} onSelectionChange={onSelectionChange} /></div>, locale);
      const input = screen.getByRole("combobox");
      typeInto(input, "lamp");
      fireEvent.keyDown(input, { key: "ArrowDown" });
      fireEvent.keyDown(input, { key: "ArrowDown" });
      fireEvent.keyDown(input, { key: "ArrowDown" });
      // Two enabled rows and a disabled third: the cursor wraps past the disabled one.
      const active = document.getElementById(input.getAttribute("aria-activedescendant") ?? "");
      expect(active?.getAttribute("aria-disabled"), locale).not.toBe("true");
      fireEvent.keyDown(input, { key: "Enter" });
      expect(onSelectionChange, locale).toHaveBeenCalledTimes(1);
      expect(["a", "b"]).toContain(onSelectionChange.mock.calls[0][0]);
      cleanup();
    }
  });

  it("reverts the text to the chosen label on Escape and on leaving the field", () => {
    inLocale(<ComboBox label="Product" items={PRODUCTS} defaultSelectedKey="d" />);
    const input = screen.getByRole("combobox") as HTMLInputElement;
    typeInto(input, "lamp");
    fireEvent.keyDown(input, { key: "Escape" });
    expect(input.value).toBe("Café Table");
    typeInto(input, "xyz");
    act(() => input.blur());
    expect(input.value).toBe("Café Table");
  });

  it("keeps custom text with allowsCustomValue: the key goes, the text stays and is reported", () => {
    const onSelectionChange = vi.fn();
    const onInputChange = vi.fn();
    inLocale(<ComboBox label="Brand" items={PRODUCTS} allowsCustomValue defaultSelectedKey="a" onSelectionChange={onSelectionChange} onInputChange={onInputChange} />);
    const input = screen.getByRole("combobox") as HTMLInputElement;
    typeInto(input, "Oak Bookshelf");
    act(() => input.blur());
    expect(onSelectionChange).toHaveBeenLastCalledWith(null);
    expect(onInputChange).toHaveBeenLastCalledWith("Oak Bookshelf");
    expect(input.value).toBe("Oak Bookshelf");
  });

  it("clears the text when the value is reset to null from outside", () => {
    const view = (key: string | null) => (
      <DesignSystemProvider locale="en" navigate={vi.fn()}><ComboBox label="Product" items={PRODUCTS} selectedKey={key} /></DesignSystemProvider>
    );
    const { rerender } = render(view("a"));
    expect((screen.getByRole("combobox") as HTMLInputElement).value).toBe("Desk Lamp · Black");
    rerender(view(null));
    expect((screen.getByRole("combobox") as HTMLInputElement).value).toBe("");
  });

  it("shows a server value's label once its page arrives, even without selectedItem", async () => {
    const loadItems = vi.fn(async () => ({ items: [{ id: "me", label: "Montenegro" }] }));
    inLocale(<ComboBox label="Country" loadItems={loadItems} selectedKey="me" />);
    await waitFor(() => expect((screen.getByRole("combobox") as HTMLInputElement).value).toBe("Montenegro"));
  });

  it("never overwrites what the user is typing when a server page brings the chosen label", async () => {
    let release: (value: { items: ComboBoxItem[] }) => void = () => {};
    const loadItems = vi.fn(() => new Promise<{ items: ComboBoxItem[] }>((resolve) => {
      release = resolve;
    }));
    inLocale(<ComboBox label="Country" loadItems={loadItems} selectedKey="li" />);
    const input = screen.getByRole("combobox") as HTMLInputElement;
    typeInto(input, "li");
    await act(async () => release({ items: [{ id: "li", label: "Liechtenstein" }] }));
    expect(input.value).toBe("li");
  });

  it("closes the menu after a create", () => {
    const onCreate = vi.fn();
    inLocale(<ComboBox label="Product" items={PRODUCTS} onCreate={onCreate} />);
    typeInto(screen.getByRole("combobox"), "stool");
    press(document.querySelector('[data-slot="combobox-create"]')!);
    expect(onCreate).toHaveBeenCalledWith("stool");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("asks the server for the next page when the end of the list comes into view", async () => {
    intersectAll = true;
    const loadItems = vi.fn(async (_text: string, cursor?: string) =>
      cursor ? { items: [{ id: "kh", label: "Cambodia" }] } : { items: [{ id: "ca", label: "Canada" }], cursor: "page-2" },
    );
    try {
      inLocale(<ComboBox label="Country" loadItems={loadItems} />);
      typeInto(screen.getByRole("combobox"), "ca");
      await waitFor(() => expect(loadItems).toHaveBeenCalledWith("ca", "page-2", expect.any(AbortSignal)));
      await waitFor(() => expect(options().map(optionName)).toEqual(["Canada", "Cambodia"]));
    } finally {
      intersectAll = false;
    }
  });

  it("never flips control when selectedKey starts undefined", () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const view = (key?: string) => (
      <DesignSystemProvider locale="en" navigate={vi.fn()}><ComboBox label="Product" items={PRODUCTS} selectedKey={key} /></DesignSystemProvider>
    );
    const { rerender } = render(view());
    rerender(view("d"));
    expect((screen.getByRole("combobox") as HTMLInputElement).value).toBe("Café Table");
    expect(errors.mock.calls.flat().join(" ")).not.toMatch(/controlled/i);
    errors.mockRestore();
  });
});

describe("ComboBox · multiple", () => {
  const CUSTOMERS: ComboBoxItem[] = [
    { id: "ana", label: "Ana Đurović" },
    { id: "renee", label: "Renée Dubois" },
    { id: "ivan", label: "Ivan Kovač" },
  ];

  it("adds tags, keeps the menu open, clears the text and removes the last tag with Backspace", () => {
    const onSelectionChange = vi.fn();
    inLocale(<ComboBox selectionMode="multiple" label="Customers" items={CUSTOMERS} defaultSelectedKeys={["ana"]} onSelectionChange={onSelectionChange} />);
    const input = screen.getByRole("combobox") as HTMLInputElement;
    typeInto(input, "renee");
    press(options()[0]);
    expect(onSelectionChange).toHaveBeenLastCalledWith(["ana", "renee"]);
    expect(input.value).toBe("");
    expect(Array.from(document.querySelectorAll('[data-slot="combobox-tag"]')).map((tag) => tag.textContent)).toEqual(["Ana Đurović", "Renée Dubois"]);
    fireEvent.keyDown(input, { key: "Backspace" });
    expect(onSelectionChange).toHaveBeenLastCalledWith(["ana"]);
  });

  it("does not report a change when React Aria re-commits the same tags on blur", () => {
    const onSelectionChange = vi.fn();
    inLocale(<ComboBox selectionMode="multiple" label="Customers" items={CUSTOMERS} defaultSelectedKeys={["ana"]} onSelectionChange={onSelectionChange} />);
    const input = screen.getByRole("combobox") as HTMLInputElement;
    typeInto(input, "iv");
    act(() => input.blur());
    expect(onSelectionChange).not.toHaveBeenCalled();
  });

  it("keeps a tag for a chosen key with no known item, shown by its key", () => {
    inLocale(<ComboBox selectionMode="multiple" label="Customers" items={CUSTOMERS} defaultSelectedKeys={["ana", "mia-77"]} />);
    expect(Array.from(document.querySelectorAll('[data-slot="combobox-tag"]')).map((tag) => tag.textContent)).toEqual(["Ana Đurović", "mia-77"]);
  });

  it("removes a tag from its own button without opening the menu", () => {
    const onSelectionChange = vi.fn();
    inLocale(<ComboBox selectionMode="multiple" label="Customers" items={CUSTOMERS} defaultSelectedKeys={["ana", "ivan"]} onSelectionChange={onSelectionChange} />);
    press(screen.getByRole("button", { name: DS_STRINGS.removeItem.en.replace("{label}", "Ivan Kovač") }));
    expect(onSelectionChange).toHaveBeenLastCalledWith(["ana"]);
    expect(screen.queryByRole("listbox")).toBeNull();
  });
});

describe("Autocomplete", () => {
  const PLACES = [
    { id: "hotel", label: "Grand Hotel, Lisbon", description: "Seafront Road", icon: "building-2" as const, group: "Suggested places" },
    { id: "spa", label: "Grand Conference & Spa, Lisbon", group: "Addresses" },
  ];

  function Harness({ getSuggestions, onSelectSuggestion }: { getSuggestions: (text: string) => Promise<typeof PLACES>; onSelectSuggestion?: (s: unknown) => void }) {
    const [value, setValue] = React.useState("");
    return (
      <Autocomplete
        label="Delivery address"
        icon="map-pin"
        value={value}
        onChange={setValue}
        groups={["Suggested places", "Addresses"]}
        getSuggestions={getSuggestions}
        onSelectSuggestion={onSelectSuggestion}
      />
    );
  }

  it("waits for 2 characters and 250ms, shows a spinner while it loads, and keeps free text", async () => {
    vi.useFakeTimers();
    const getSuggestions = vi.fn(async () => PLACES);
    inLocale(<Harness getSuggestions={getSuggestions} />);
    const input = screen.getByRole("combobox", { name: "Delivery address" }) as HTMLInputElement;
    typeInto(input, "l");
    act(() => vi.advanceTimersByTime(300));
    expect(getSuggestions).not.toHaveBeenCalled();
    typeInto(input, "li");
    expect(document.querySelector('[data-slot="field-spinner"]')).not.toBeNull();
    act(() => vi.advanceTimersByTime(200));
    expect(getSuggestions).not.toHaveBeenCalled();
    await act(async () => {
      vi.advanceTimersByTime(60);
    });
    expect(getSuggestions).toHaveBeenCalledWith("li", expect.any(AbortSignal));
    vi.useRealTimers();
    expect(input.value).toBe("li");
  });

  it("closes after a pick and does not search again for the filled-in text", async () => {
    const getSuggestions = vi.fn(async (_text: string) => PLACES);
    inLocale(<Harness getSuggestions={getSuggestions} />);
    const input = screen.getByRole("combobox") as HTMLInputElement;
    typeInto(input, "lis");
    await waitFor(() => expect(options()).toHaveLength(2), { timeout: 2000 });
    press(options()[0]);
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(getSuggestions.mock.calls.map((call) => call[0])).toEqual(["lis"]);
  });

  it("closes after picking a suggestion whose label is already the typed text", async () => {
    const exact = [{ id: "porto", label: "Porto" }];
    inLocale(<Harness getSuggestions={async () => exact as typeof PLACES} />);
    const input = screen.getByRole("combobox") as HTMLInputElement;
    typeInto(input, "Porto");
    await waitFor(() => expect(options()).toHaveLength(1), { timeout: 2000 });
    press(options()[0]);
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
  });

  it("keeps the user's own text on leaving the field", async () => {
    inLocale(<Harness getSuggestions={async () => PLACES} />);
    const input = screen.getByRole("combobox") as HTMLInputElement;
    typeInto(input, "12 Harbour Street");
    act(() => input.blur());
    expect(input.value).toBe("12 Harbour Street");
  });

  it("groups suggestions in the given order and fills the text from one", async () => {
    const onSelectSuggestion = vi.fn();
    inLocale(<Harness getSuggestions={async () => [...PLACES].reverse()} onSelectSuggestion={onSelectSuggestion} />);
    const input = screen.getByRole("combobox") as HTMLInputElement;
    typeInto(input, "lis");
    await waitFor(() => expect(options()).toHaveLength(2), { timeout: 2000 });
    expect(Array.from(document.querySelectorAll('[data-slot="autocomplete-section-header"]')).map((header) => header.textContent)).toEqual(["Suggested places", "Addresses"]);
    press(options()[0]);
    expect(input.value).toBe("Grand Hotel, Lisbon");
    expect(onSelectSuggestion).toHaveBeenCalledWith(expect.objectContaining({ id: "hotel" }));
  });
});

describe("TagGroup", () => {
  const FILTERS = [
    { id: "stock", label: "In stock" },
    { id: "items", label: "5+ items" },
    { id: "price", label: "€ 40 – € 120" },
  ];

  it("removes a tag with its named button and offers Clear all from three tags up", () => {
    const onRemove = vi.fn();
    const { rerender } = inLocale(<TagGroup label="Active filters" items={FILTERS} onRemove={onRemove} />);
    expect(screen.getByRole("grid", { name: "Active filters" })).toBeTruthy();
    // Named by its own label only, not "… 5+ items" twice.
    press(screen.getByRole("button", { name: DS_STRINGS.removeItem.en.replace("{label}", "5+ items") }));
    expect(onRemove).toHaveBeenLastCalledWith(["items"]);
    press(screen.getByRole("button", { name: DS_STRINGS.clearAll.en }));
    expect(onRemove).toHaveBeenLastCalledWith(["stock", "items", "price"]);
    rerender(
      <DesignSystemProvider locale="en" navigate={vi.fn()}>
        <TagGroup label="Active filters" items={FILTERS.slice(0, 2)} onRemove={onRemove} />
      </DesignSystemProvider>,
    );
    expect(screen.queryByRole("button", { name: DS_STRINGS.clearAll.en })).toBeNull();
  });

  it("selects tags and reports the selected keys", () => {
    const onSelectionChange = vi.fn();
    inLocale(
      <TagGroup
        label="Features"
        selectionMode="multiple"
        defaultSelectedKeys={["ac"]}
        onSelectionChange={onSelectionChange}
        items={[{ id: "ac", label: "Cooling", icon: "snowflake" }, { id: "nav", label: "Navigation", icon: "navigation" }]}
      />,
    );
    const rows = screen.getAllByRole("row");
    expect(rows[0].getAttribute("aria-selected")).toBe("true");
    press(rows[1]);
    expect(onSelectionChange).toHaveBeenLastCalledWith(["ac", "nav"]);
    expect(rows[0].querySelector('[data-slot="tag-icon"]')?.getAttribute("data-icon")).toBe("snowflake");
  });

  it("counts only removable tags towards Clear all", () => {
    const onRemove = vi.fn();
    inLocale(
      <TagGroup
        label="Filters"
        onRemove={onRemove}
        items={[{ id: "a", label: "A" }, { id: "b", label: "B" }, { id: "c", label: "C", isDisabled: true }]}
      />,
    );
    expect(screen.queryByRole("button", { name: DS_STRINGS.clearAll.en })).toBeNull();
  });

  it("keeps a selected tag selected while hovered: the plain hover fill skips selected tags", () => {
    expect(TAG_ITEM).toContain("data-[hovered]:data-[selection-mode]:not-data-[selected]:bg-ds-background-neutral-hovered");
    expect(TAG_ITEM).toContain("data-[selected]:data-[hovered]:bg-ds-background-selected-hovered");
    expect(TAG_ITEM).not.toMatch(/(^|\s)data-\[hovered\]:data-\[selection-mode\]:bg-/);
  });

  it("shows its empty message", () => {
    inLocale(<TagGroup label="Filters" items={[]} onRemove={vi.fn()} emptyMessage="No filters" />);
    expect(screen.getByText("No filters")).toBeTruthy();
  });
});

describe("strings, tokens and direction", () => {
  it("has its strings in English with their placeholders; a registered language replaces them and any other falls back to English", () => {
    for (const key of ["noMatch", "createItem", "loading", "showSuggestions", "clearAll"] as const) {
      expect(DS_STRINGS[key].en, key).toBeTruthy();
      if (key === "noMatch" || key === "createItem") expect(DS_STRINGS[key].en, key).toContain("{query}");
    }
    registerDsStrings("de", {
      noMatch: "Keine Treffer: {query}",
      createItem: "{query} anlegen",
      loading: "Wird geladen…",
      showSuggestions: "Liste zeigen",
      clearAll: "Alle entfernen",
    });
    for (const locale of ["de", "de-AT"]) {
      expect(noMatchLabel(locale, "zzzz"), locale).toBe("Keine Treffer: zzzz");
      expect(createItemLabel(locale, "stool"), locale).toBe("stool anlegen");
      expect(loadingLabel(locale), locale).toBe("Wird geladen…");
      expect(showSuggestionsLabel(locale), locale).toBe("Liste zeigen");
      expect(clearAllLabel(locale), locale).toBe("Alle entfernen");
    }
    for (const locale of ["en", "en-GB", "nl", "xx"]) {
      expect(noMatchLabel(locale, "zzzz"), locale).toBe("No results for “zzzz”.");
      expect(createItemLabel(locale, "stool"), locale).toBe(DS_STRINGS.createItem.en.replace("{query}", "stool"));
      expect(loadingLabel(locale), locale).toBe("Loading…");
      expect(showSuggestionsLabel(locale), locale).toBe(DS_STRINGS.showSuggestions.en);
      expect(clearAllLabel(locale), locale).toBe(DS_STRINGS.clearAll.en);
    }
    // The field itself speaks the registered language, and English in one that is not registered.
    for (const [locale, text] of [["de", "Keine Treffer: zzzz"], ["nl", "No results for “zzzz”."]] as const) {
      inLocale(<ComboBox label="Product" items={PRODUCTS} />, locale);
      typeInto(screen.getByRole("combobox"), "zzzz");
      expect(document.querySelector('[data-slot="combobox-empty"]')?.textContent, locale).toBe(text);
      expect(chevron().getAttribute("aria-label"), locale).toBe(locale === "de" ? "Liste zeigen" : DS_STRINGS.showSuggestions.en);
      cleanup();
    }
  });

  it("uses theme tokens and logical classes only", () => {
    for (const utility of [TAG_ITEM, TAG_REMOVE_BUTTON].join(" ").split(/\s+/)) {
      const color = /(?:^|:)(?:bg|text|border|inset-ring)-(ds-[a-z-]+)$/.exec(utility);
      if (color) expect(theme, utility).toMatch(new RegExp(`--(color|text)-${color[1]}:`));
    }
    const { container } = inLocale(
      <div dir="rtl">
        <ComboBox label="ا" items={PRODUCTS} defaultSelectedKey="a" />
        <ComboBox selectionMode="multiple" label="ب" items={PRODUCTS} defaultSelectedKeys={["a"]} />
        <Autocomplete label="ج" value="" onChange={() => {}} getSuggestions={async () => []} />
        <TagGroup label="د" items={[{ id: "x", label: "س" }]} onRemove={() => {}} />
      </div>,
      "he",
    );
    const parts = Array.from(container.querySelectorAll("[data-slot]"));
    expect(parts.length).toBeGreaterThan(12);
    for (const part of parts) expect(classesOf(part), part.getAttribute("data-slot") ?? "").not.toMatch(PHYSICAL);
    expect(Array.from(container.querySelectorAll('[data-slot="combobox-button"]')).map((button) => button.getAttribute("aria-label"))).toEqual([
      DS_STRINGS.showSuggestions.en,
      DS_STRINGS.showSuggestions.en,
    ]);
  });
});
