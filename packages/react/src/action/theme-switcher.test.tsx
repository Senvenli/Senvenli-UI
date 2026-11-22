import * as React from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DS_STRINGS, registerDsStrings, themeLabels } from "../i18n";
import { DesignSystemProvider } from "../provider";
import { DEFAULT_THEME_STORAGE_KEY as KEY, ThemeSwitcher, themeScript, themeScriptSource } from "./index";
import { resetThemeStoresForTests } from "./theme-switcher";

const PHYSICAL = /(^|\s|:)(-?m[lr]-|p[lr]-|-?left-|-?right-|border-[lr](-|\s|$)|rounded-[lr]-|text-left|text-right)/;
const classesOf = (element: Element | null | undefined) => element?.getAttribute("class") ?? "";
const html = () => document.documentElement;

let systemDark = false;
let mediaListeners: ((event: { matches: boolean }) => void)[] = [];
beforeEach(() => {
  systemDark = false;
  mediaListeners = [];
  window.localStorage.clear();
  resetThemeStoresForTests();
  html().removeAttribute("data-theme");
  window.matchMedia = ((query: string) => ({
    matches: query.includes("dark") ? systemDark : false,
    media: query,
    addEventListener: (_: string, listener: (event: { matches: boolean }) => void) => mediaListeners.push(listener),
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
});
afterEach(cleanup);

function inProvider(ui: React.ReactElement) {
  return render(<DesignSystemProvider locale="en" navigate={vi.fn()}>{ui}</DesignSystemProvider>);
}

// The group says "Theme"; each radio is just its option.
const radio = (name: string) => screen.getByRole("radio", { name });

describe("ThemeSwitcher", () => {
  it("is a radio group named Theme, System by default, following the device", () => {
    systemDark = true;
    inProvider(<ThemeSwitcher />);
    const group = screen.getByRole("radiogroup", { name: DS_STRINGS.theme.en });
    expect(within(group).getAllByRole("radio")).toHaveLength(3);
    expect(radio(DS_STRINGS.themeSystem.en).getAttribute("aria-checked")).toBe("true");
    expect(html().getAttribute("data-theme")).toBe("dark");
  });

  it("stores a choice, applies it, and System removes it again", () => {
    inProvider(<ThemeSwitcher />);
    fireEvent.click(radio(DS_STRINGS.themeDark.en));
    expect(radio(DS_STRINGS.themeDark.en).getAttribute("aria-checked")).toBe("true");
    expect(window.localStorage.getItem(KEY)).toBe("dark");
    expect(html().getAttribute("data-theme")).toBe("dark");
    fireEvent.click(radio(DS_STRINGS.themeSystem.en));
    expect(window.localStorage.getItem(KEY)).toBeNull();
    expect(html().getAttribute("data-theme")).toBe("light");
  });

  it("restores the stored choice after a reload and follows other tabs", () => {
    window.localStorage.setItem(KEY, "light");
    systemDark = true;
    inProvider(<ThemeSwitcher />);
    expect(radio(DS_STRINGS.themeLight.en).getAttribute("aria-checked")).toBe("true");
    expect(html().getAttribute("data-theme")).toBe("light");
    act(() => {
      window.localStorage.setItem(KEY, "dark");
      window.dispatchEvent(new StorageEvent("storage", { key: KEY, newValue: "dark" }));
    });
    expect(radio(DS_STRINGS.themeDark.en).getAttribute("aria-checked")).toBe("true");
    expect(html().getAttribute("data-theme")).toBe("dark");
  });

  it("follows the device live while on System", () => {
    inProvider(<ThemeSwitcher />);
    expect(html().getAttribute("data-theme")).toBe("light");
    act(() => {
      systemDark = true;
      mediaListeners.forEach((listener) => listener({ matches: true }));
    });
    expect(html().getAttribute("data-theme")).toBe("dark");
  });

  it("follows the device in old Safari, which only has addListener", () => {
    const legacy: (() => void)[] = [];
    window.matchMedia = ((query: string) => ({
      get matches() {
        return query.includes("dark") ? systemDark : false;
      },
      media: query,
      addListener: (listener: () => void) => legacy.push(listener),
      removeListener: () => {},
    })) as unknown as typeof window.matchMedia;
    inProvider(<ThemeSwitcher />);
    expect(html().getAttribute("data-theme")).toBe("light");
    act(() => {
      systemDark = true;
      legacy.forEach((listener) => listener());
    });
    expect(html().getAttribute("data-theme")).toBe("dark");
  });

  it("works without storage, for the session", () => {
    const get = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const set = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    try {
      inProvider(<ThemeSwitcher />);
      fireEvent.click(radio(DS_STRINGS.themeDark.en));
      expect(radio(DS_STRINGS.themeDark.en).getAttribute("aria-checked")).toBe("true");
      expect(html().getAttribute("data-theme")).toBe("dark");
    } finally {
      get.mockRestore();
      set.mockRestore();
    }
  });

  it("is one tab stop; arrow keys move and select", () => {
    inProvider(<><button>before</button><ThemeSwitcher /><button>after</button></>);
    const radios = screen.getAllByRole("radio");
    // Only the checked radio takes Tab, so Tab enters once and the next Tab leaves.
    expect(radios.map((item) => item.tabIndex)).toEqual([0, -1, -1]);
    const tabbable = Array.from(document.querySelectorAll<HTMLElement>("button")).filter((element) => element.tabIndex >= 0);
    expect(tabbable.map((element) => element.textContent || element.getAttribute("aria-label"))).toEqual(["before", DS_STRINGS.themeSystem.en, "after"]);
    act(() => radios[0].focus());
    fireEvent.keyDown(radios[0], { key: "ArrowRight" });
    expect(document.activeElement).toBe(radios[1]);
    expect(radios[1].getAttribute("aria-checked")).toBe("true");
    expect(html().getAttribute("data-theme")).toBe("light");
    fireEvent.keyDown(radios[1], { key: "ArrowRight" });
    expect(radios[2].getAttribute("aria-checked")).toBe("true");
    expect(html().getAttribute("data-theme")).toBe("dark");
  });

  it("never changes the theme just because a segment receives focus", () => {
    inProvider(<ThemeSwitcher />);
    // A screen reader's cursor, focus returning to the page or a focus scope: focus alone selects nothing.
    act(() => radio(DS_STRINGS.themeDark.en).focus());
    expect(radio(DS_STRINGS.themeSystem.en).getAttribute("aria-checked")).toBe("true");
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });

  it("keeps another tab's choice when focus comes back to this one", () => {
    inProvider(<ThemeSwitcher />);
    const dark = radio(DS_STRINGS.themeDark.en);
    fireEvent.click(dark);
    act(() => dark.blur());
    // Another tab picks Light; this one follows, then the browser gives focus back to Dark.
    act(() => {
      window.localStorage.setItem(KEY, "light");
      window.dispatchEvent(new StorageEvent("storage", { key: KEY, newValue: "light" }));
    });
    act(() => radio(DS_STRINGS.themeDark.en).focus());
    expect(window.localStorage.getItem(KEY)).toBe("light");
    expect(radio(DS_STRINGS.themeLight.en).getAttribute("aria-checked")).toBe("true");
  });

  it("keeps two toggles on one page in step (Navbar and phone menu)", () => {
    const { container } = inProvider(<><ThemeSwitcher /><ThemeSwitcher variant="list" /></>);
    const [segmented, list] = Array.from(container.querySelectorAll('[role="radiogroup"]')) as HTMLElement[];
    fireEvent.click(within(list).getAllByRole("radio")[2]);
    expect(within(segmented).getAllByRole("radio")[2].getAttribute("aria-checked")).toBe("true");
    // The stale-instance bug: the device turning light must not undo an explicit Dark.
    act(() => mediaListeners.forEach((listener) => listener({ matches: false })));
    expect(html().getAttribute("data-theme")).toBe("dark");
  });

  it("follows a cleared storage back to System", () => {
    window.localStorage.setItem(KEY, "dark");
    inProvider(<ThemeSwitcher />);
    expect(radio(DS_STRINGS.themeDark.en).getAttribute("aria-checked")).toBe("true");
    act(() => {
      window.localStorage.clear();
      window.dispatchEvent(new StorageEvent("storage", { key: null }));
    });
    expect(radio(DS_STRINGS.themeSystem.en).getAttribute("aria-checked")).toBe("true");
  });

  it("never writes a wrong theme while mounting", () => {
    window.localStorage.setItem(KEY, "dark");
    html().setAttribute("data-theme", "dark"); // as the head script left it
    const seen: (string | null)[] = [];
    const observer = new MutationObserver(() => seen.push(html().getAttribute("data-theme")));
    observer.observe(html(), { attributes: true, attributeFilter: ["data-theme"] });
    inProvider(<ThemeSwitcher />);
    observer.takeRecords().forEach(() => seen.push(html().getAttribute("data-theme")));
    observer.disconnect();
    expect(seen.every((value) => value === "dark")).toBe(true);
    expect(html().getAttribute("data-theme")).toBe("dark");
  });

  it("never writes a wrong theme while hydrating", async () => {
    window.localStorage.setItem(KEY, "dark");
    const ui = <DesignSystemProvider locale="en" navigate={vi.fn()}><ThemeSwitcher /></DesignSystemProvider>;
    const host = document.createElement("div");
    host.innerHTML = renderToString(ui);
    document.body.appendChild(host);
    html().setAttribute("data-theme", "dark"); // as the head script left it
    const observer = new MutationObserver(() => {});
    observer.observe(html(), { attributes: true, attributeFilter: ["data-theme"], attributeOldValue: true });
    let root: ReturnType<typeof hydrateRoot> | undefined;
    const recoverable = vi.fn();
    await act(async () => {
      root = hydrateRoot(host, ui, { onRecoverableError: recoverable });
    });
    // No hydration mismatch either.
    expect(recoverable).not.toHaveBeenCalled();
    // Every change seen, old value and new: nothing ever passed through light.
    const changes = observer.takeRecords().map((record) => [record.oldValue, html().getAttribute("data-theme")]);
    observer.disconnect();
    expect(changes.flat().every((value) => value === "dark")).toBe(true);
    expect(html().getAttribute("data-theme")).toBe("dark");
    act(() => root?.unmount());
    host.remove();
  });

  it("keeps the session choice without storage when the last toggle unmounts (phone drawer)", () => {
    const get = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const set = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    try {
      const first = inProvider(<ThemeSwitcher variant="list" />);
      fireEvent.click(radio(DS_STRINGS.themeDark.en));
      first.unmount();
      inProvider(<ThemeSwitcher variant="list" />);
      expect(radio(DS_STRINGS.themeDark.en).getAttribute("aria-checked")).toBe("true");
      expect(html().getAttribute("data-theme")).toBe("dark");
    } finally {
      get.mockRestore();
      set.mockRestore();
    }
  });

  it("wraps at the ends and takes Home and End, like a radio group", () => {
    inProvider(<ThemeSwitcher />);
    const [system, , dark] = screen.getAllByRole("radio");
    act(() => system.focus());
    fireEvent.keyDown(system, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(dark);
    expect(dark.getAttribute("aria-checked")).toBe("true");
    fireEvent.keyDown(dark, { key: "ArrowRight" });
    expect(system.getAttribute("aria-checked")).toBe("true");
    fireEvent.keyDown(system, { key: "End" });
    expect(dark.getAttribute("aria-checked")).toBe("true");
    fireEvent.keyDown(dark, { key: "Home" });
    expect(system.getAttribute("aria-checked")).toBe("true");
    // Up and Down work in the horizontal group too, mid-group as well as at the ends.
    fireEvent.keyDown(system, { key: "ArrowDown" });
    expect(screen.getAllByRole("radio")[1].getAttribute("aria-checked")).toBe("true");
    fireEvent.keyDown(screen.getAllByRole("radio")[1], { key: "ArrowUp" });
    expect(system.getAttribute("aria-checked")).toBe("true");
  });

  it("moves with Left and Right in the vertical list too", () => {
    inProvider(<ThemeSwitcher variant="list" />);
    const [system, light] = screen.getAllByRole("radio");
    act(() => system.focus());
    fireEvent.keyDown(system, { key: "ArrowRight" });
    expect(document.activeElement).toBe(light);
    expect(light.getAttribute("aria-checked")).toBe("true");
  });

  it("names every icon-only segment and shows a tooltip that says what System means now", async () => {
    systemDark = true;
    inProvider(<ThemeSwitcher />);
    const system = radio(DS_STRINGS.themeSystem.en);
    act(() => system.focus());
    fireEvent.keyDown(system, { key: "Tab" });
    fireEvent.keyUp(system, { key: "Tab" });
    act(() => {
      system.blur();
      system.focus();
    });
    const tip = await screen.findByRole("tooltip");
    expect(tip.textContent).toBe(`${DS_STRINGS.theme.en}: ${DS_STRINGS.themeSystem.en} · ${DS_STRINGS.themeNowDark.en}`);
    for (const item of screen.getAllByRole("radio")) expect(item.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("has the design's look: neutral track, raised selected segment, inner focus border", () => {
    inProvider(<ThemeSwitcher />);
    const group = screen.getByRole("radiogroup");
    expect(classesOf(group).split(/\s+/)).toEqual(expect.arrayContaining(["bg-ds-background-neutral", "rounded-ds-medium"]));
    expect(classesOf(radio(DS_STRINGS.themeSystem.en)).split(/\s+/)).toEqual(
      expect.arrayContaining(["size-7", "data-[selected]:bg-ds-background-segment-selected", "data-[selected]:shadow-ds-raised", "data-[focus-visible]:inset-ring-2"]),
    );
  });

  it("can be controlled, and becomes a checked list in the phone menu", () => {
    const onChange = vi.fn();
    inProvider(<ThemeSwitcher value="light" onChange={onChange} variant="list" />);
    const group = screen.getByRole("radiogroup", { name: DS_STRINGS.theme.en });
    const rows = within(group).getAllByRole("radio");
    expect(rows.map((row) => row.textContent)).toEqual([DS_STRINGS.themeSystem.en, DS_STRINGS.themeLight.en, DS_STRINGS.themeDark.en]);
    expect(rows[1].querySelector('[data-slot="theme-switcher-check"]')).toBeTruthy();
    expect(classesOf(rows[0])).toContain("text-start");
    fireEvent.click(rows[2]);
    expect(onChange).toHaveBeenCalledWith("dark");
    // Controlled: the parent owns the theme, so nothing is stored or applied here.
    expect(window.localStorage.getItem(KEY)).toBeNull();
    expect(html().hasAttribute("data-theme")).toBe(false);
  });

  it("renders the same on the server and the first client render (System until storage is read)", () => {
    const markup = renderToString(<DesignSystemProvider locale="en" navigate={vi.fn()}><ThemeSwitcher /></DesignSystemProvider>);
    expect(markup).toContain('role="radiogroup"');
    expect(markup.match(/aria-checked="true"/g)).toHaveLength(1);
  });
});

describe("ThemeSwitcher variant=menu", () => {
  // jsdom has no CSS.escape; React Aria's Menu uses it to find the focused item.
  beforeEach(() => {
    globalThis.CSS ??= {} as typeof CSS;
    CSS.escape ??= (value: string) => value.replace(/[^\w-]/g, (char) => `\\${char}`);
  });

  it("is one button naming the choice; its menu picks, checks and stores a theme", async () => {
    inProvider(<ThemeSwitcher variant="menu" />);
    const trigger = screen.getByRole("button", { name: `${DS_STRINGS.theme.en}: System` });
    fireEvent.click(trigger);
    const menu = await screen.findByRole("menu");
    expect(menu.getAttribute("aria-label")).toBe(DS_STRINGS.theme.en);
    const items = within(menu).getAllByRole("menuitemradio");
    expect(items.map((item) => item.textContent)).toEqual(["System", "Light", "Dark"]);
    expect(items[0]!.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(items[2]!);
    expect(html().dataset.theme ?? html().getAttribute("data-theme")).toBe("dark");
    expect(window.localStorage.getItem(KEY)).toBe("dark");
    expect(screen.getByRole("button", { name: `${DS_STRINGS.theme.en}: Dark` })).toBeTruthy();
  });
});

describe("themeScript", () => {
  function run(source: string) {
    new Function(source)();
  }

  it("applies the stored choice, or the device setting, before paint", () => {
    window.localStorage.setItem(KEY, "dark");
    run(themeScriptSource());
    expect(html().getAttribute("data-theme")).toBe("dark");
    window.localStorage.removeItem(KEY);
    systemDark = true;
    run(themeScriptSource());
    expect(html().getAttribute("data-theme")).toBe("dark");
    systemDark = false;
    run(themeScriptSource());
    expect(html().getAttribute("data-theme")).toBe("light");
  });

  it("still applies the device setting when storage throws", () => {
    const get = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    try {
      systemDark = true;
      run(themeScriptSource());
      expect(html().getAttribute("data-theme")).toBe("dark");
    } finally {
      get.mockRestore();
    }
  });

  it("carries the CSP nonce and cannot be broken out of by the key", () => {
    const markup = renderToString(themeScript("abc123", "x</script><script>alert(1)//"));
    expect(markup).toContain('nonce="abc123"');
    expect(markup.match(/<\/script>/g)).toHaveLength(1);
    expect(themeScriptSource()).not.toMatch(/fetch|cookie|eval/);
  });
});

describe("strings and direction", () => {
  it("has every theme string in English and uses a registered language for all of them", () => {
    const keys = ["theme", "themeSystem", "themeLight", "themeDark", "themeNowLight", "themeNowDark"] as const;
    for (const key of keys) expect(DS_STRINGS[key].en, key).toBeTruthy();
    const german = { theme: "Design", themeSystem: "Automatisch", themeLight: "Hell", themeDark: "Dunkel", themeNowLight: "jetzt hell", themeNowDark: "jetzt dunkel" };
    registerDsStrings("de", german);
    expect(themeLabels("de-AT")).toEqual({ theme: "Design", system: "Automatisch", light: "Hell", dark: "Dunkel", nowLight: "jetzt hell", nowDark: "jetzt dunkel" });
    const rows = (locale: string, name: string) => {
      const { unmount } = render(<DesignSystemProvider locale={locale} navigate={vi.fn()}><ThemeSwitcher variant="list" /></DesignSystemProvider>);
      const texts = within(screen.getByRole("radiogroup", { name })).getAllByRole("radio").map((row) => row.textContent);
      unmount();
      return texts;
    };
    expect(rows("de", german.theme)).toEqual(["Automatisch", "Hell", "Dunkel"]);
    expect(rows("de-AT", german.theme)).toEqual(["Automatisch", "Hell", "Dunkel"]);
    // A language nobody registered falls back to English.
    expect(rows("nl", DS_STRINGS.theme.en)).toEqual([DS_STRINGS.themeSystem.en, DS_STRINGS.themeLight.en, DS_STRINGS.themeDark.en]);
    expect(themeLabels("nl")).toEqual(themeLabels("en"));
  });

  it("uses logical classes and moves with the arrows in RTL", () => {
    const { container } = render(
      <DesignSystemProvider locale="ar" navigate={vi.fn()}>
        <div dir="rtl"><ThemeSwitcher /><ThemeSwitcher variant="list" /></div>
      </DesignSystemProvider>,
    );
    for (const part of Array.from(container.querySelectorAll("[data-slot]"))) {
      expect(classesOf(part), part.getAttribute("data-slot") ?? "").not.toMatch(PHYSICAL);
    }
    const radios = within(container.querySelector('[data-variant="segmented"]') as HTMLElement).getAllByRole("radio");
    act(() => radios[0].focus());
    // In RTL the next segment is to the left.
    fireEvent.keyDown(radios[0], { key: "ArrowLeft" });
    expect(document.activeElement).toBe(radios[1]);
  });
});
