import * as React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { registerDsStrings } from "../i18n";
import { registerLocaleAliases } from "../intl-locale";
import { LanguageLabel, LanguageSwitcher, languageName, registerLanguageNames } from "./index";

afterEach(cleanup);

beforeAll(() => {
  // jsdom implements none of these; React Aria's listbox and popover call them while opening.
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  globalThis.CSS ??= {} as typeof CSS;
  CSS.escape ??= (value: string) => value.replace(/[^\w-]/g, (char) => `\\${char}`);
});

// English names: English, German, Russian, Turkish. Nothing in this file registers a name for these four
// under "en" or "fr", so their names here are always Intl's.
const LOCALES = ["en", "tr", "de", "ru"] as const;

/** An app's mark for a language: here a short chip, where an app might draw a flag. */
const mark = (locale: string) => <span data-testid="mark">{`[${locale}]`}</span>;

type Options = {
  locales?: readonly string[];
  current?: string;
  label?: string;
  loading?: boolean;
  sidebar?: boolean;
  collapsed?: boolean;
  renderMark?: (locale: string) => React.ReactNode;
};

function renderSwitcher({ locales = LOCALES, current = "en", ...props }: Options = {}) {
  const onSelect = vi.fn();
  render(<LanguageSwitcher locales={locales} current={current} onSelect={onSelect} {...props} />);
  return { onSelect };
}

/** Keyboard, so the test does not depend on jsdom's pointer-capture stubs. */
function openList(label = "Language") {
  fireEvent.keyDown(screen.getByRole("button", { name: label }), { key: "Enter" });
}

/** The visible name of every row, in list order. */
function listNames(): (string | null | undefined)[] {
  return screen
    .getAllByRole("option")
    .map((item) => item.querySelector('[data-slot="language-label"] > span:last-child')?.textContent);
}

const checkOf = (item: Element) => item.querySelector('[data-slot="language-switcher-check"]');

describe("LanguageSwitcher current language", () => {
  it("shows the current language's name in the trigger and every language's name in the list", () => {
    renderSwitcher({ current: "en", sidebar: true });

    const trigger = screen.getByRole("button", { name: "Language" });
    expect(trigger.textContent).toBe("English");

    openList();

    for (const name of ["English", "Turkish", "German", "Russian"]) {
      expect(screen.getByRole("option", { name }).querySelector('[data-slot="language-label"]')?.textContent).toBe(name);
    }
  });

  it("ticks the current language and only that one", () => {
    renderSwitcher({ current: "de", label: "Language" });
    openList();

    const ticked = screen.getAllByRole("option").filter((item) => checkOf(item)?.querySelector("svg"));

    expect(ticked).toHaveLength(1);
    expect(ticked[0]!.textContent).toContain(languageName("de", "de"));
  });

  it("marks the current language for assistive technology, not just visually", () => {
    renderSwitcher({ current: "ru", label: "Language" });
    openList();

    const current = screen.getAllByRole("option").filter((item) => item.getAttribute("aria-selected") === "true");

    expect(current).toHaveLength(1);
    expect(current[0]!.textContent).toContain(languageName("ru", "ru"));
  });

  it("reserves the tick slot on every row so switching never shifts them", () => {
    renderSwitcher();
    openList();

    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(LOCALES.length);
    for (const item of options) {
      const slot = checkOf(item);
      expect(slot).not.toBeNull();
      expect(slot!.getAttribute("aria-hidden")).toBe("true");
      expect(slot!.className.split(/\s+/)).toContain("size-4");
    }
  });

  it("places the selection indicator at the start, before the mark and the name", () => {
    renderSwitcher({ current: "en", renderMark: mark });
    openList();

    const item = screen.getByRole("option", { name: "English" });
    const first = item.firstElementChild;
    expect(first).toBe(checkOf(item));
    expect(first?.querySelector("svg")).not.toBeNull();

    const labelSlot = item.querySelector('[data-slot="language-label"]');
    expect(labelSlot).not.toBeNull();
    expect(item.children[1]).toBe(labelSlot);
    expect(labelSlot!.querySelector('[data-slot="language-mark"]')).not.toBeNull();
  });
});

describe("LanguageSwitcher accessible name", () => {
  it('is the design system\'s "Language" when the caller gives no label', () => {
    renderSwitcher();
    expect(screen.getByRole("button", { name: "Language" })).toBeTruthy();
  });

  it("uses the caller's label on the trigger", () => {
    renderSwitcher({ label: "Display language" });
    expect(screen.getByRole("button", { name: "Display language" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Language" })).toBeNull();
  });

  it("keeps the label while the control is still disabled", () => {
    renderSwitcher({ label: "Display language", loading: true });
    expect(screen.getByRole("button", { name: "Display language" }).hasAttribute("disabled")).toBe(true);
    cleanup();

    renderSwitcher({ loading: true });
    expect(screen.getByRole("button", { name: "Language" }).hasAttribute("disabled")).toBe(true);
  });

  it("takes the default from the strings registered for the current language, else English", () => {
    // Registered strings have no reset either: every other render with "de" current passes its own label.
    registerDsStrings("de", { language: "Sprache" });

    renderSwitcher({ locales: ["en", "de", "fr"], current: "de" });
    expect(screen.getByRole("button", { name: "Sprache" })).toBeTruthy();
    cleanup();

    // No strings registered for French: the English string, while the names are French.
    renderSwitcher({ locales: ["en", "de", "fr"], current: "fr" });
    expect(screen.getByRole("button", { name: "Language" }).textContent).toBe("Français");
    cleanup();

    // The caller's label still wins over a registered string.
    renderSwitcher({ locales: ["en", "de", "fr"], current: "de", label: "Anzeigesprache" });
    expect(screen.getByRole("button", { name: "Anzeigesprache" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Sprache" })).toBeNull();
  });
});

describe("LanguageSwitcher locale list", () => {
  it("offers only the locales it was given", () => {
    renderSwitcher({ locales: ["en"], current: "en" });
    openList();

    expect(screen.getAllByRole("option")).toHaveLength(1);
    expect(screen.queryByText("Turkish")).toBeNull();
  });

  it("stays shut while the list is still resolving", () => {
    // A product restricted to one language must never flash the full list on a cold cache.
    renderSwitcher({ loading: true });

    const trigger = screen.getByRole("button", { name: "Language" });
    expect(trigger.hasAttribute("disabled")).toBe(true);
    fireEvent.keyDown(trigger, { key: "Enter" });
    expect(screen.queryAllByRole("option")).toHaveLength(0);
    expect(screen.queryByRole("listbox")).toBeNull();
  });
});

describe("LanguageSwitcher names in the UI language", () => {
  it("shows English names, not endonyms, when the UI is English", () => {
    renderSwitcher({ current: "en" });
    openList();

    expect(screen.getByRole("option", { name: "Turkish" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "German" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "Russian" })).toBeTruthy();
    expect(screen.queryByText("Türkçe")).toBeNull();
    expect(screen.queryByText("Deutsch")).toBeNull();
    expect(screen.queryByText("Русский")).toBeNull();
  });

  it("shows French names, capitalized, when the UI is French", () => {
    renderSwitcher({ locales: [...LOCALES, "fr"], current: "fr" });
    openList();

    expect(screen.getByRole("option", { name: "Anglais" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "Allemand" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "Français" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "Russe" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "Turc" })).toBeTruthy();
    expect(screen.queryByText("Deutsch")).toBeNull();
    expect(screen.queryByText("Русский")).toBeNull();
  });

  it("reports the selected locale to the caller", () => {
    const { onSelect } = renderSwitcher({ current: "en" });
    openList();

    fireEvent.click(screen.getByRole("option", { name: "Russian" }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("ru");
  });

  it("shows no locale code in any row: the name only", () => {
    renderSwitcher({ current: "en" });
    openList();

    for (const code of ["EN", "TR", "DE", "RU", "en", "tr", "de", "ru"]) {
      expect(screen.queryAllByText(code)).toHaveLength(0);
    }
    expect(listNames().some((name) => /\b(EN|TR|DE|RU)\b/i.test(name ?? ""))).toBe(false);
  });

  // Every name is written in one language, the UI's, so the visible name is the order a reader scans by.
  it("lists languages by the visible name, not by caller order", () => {
    renderSwitcher({ locales: ["ru", "en", "sq", "tr", "de"], current: "en" });
    openList();

    expect(listNames()).toEqual(["Albanian", "English", "German", "Russian", "Turkish"]);
  });

  it("orders a long list by its English names", () => {
    renderSwitcher({
      locales: ["tr", "sr", "sl", "ru", "ro", "mk", "el", "de", "en", "hr", "bg", "bs", "sq"],
      current: "en",
    });
    openList();

    expect(listNames()).toEqual([
      "Albanian",
      "Bosnian",
      "Bulgarian",
      "Croatian",
      "English",
      "German",
      "Greek",
      "Macedonian",
      "Romanian",
      "Russian",
      "Serbian",
      "Slovenian",
      "Turkish",
    ]);
  });

  it("reorders when the UI language changes", () => {
    const locales = ["ru", "en", "sq", "tr", "de", "fr"] as const;

    renderSwitcher({ locales, current: "en" });
    openList();
    const englishOrder = screen.getAllByRole("option").map((item) => item.getAttribute("data-key"));
    expect(listNames()).toEqual(["Albanian", "English", "French", "German", "Russian", "Turkish"]);
    cleanup();

    renderSwitcher({ locales, current: "fr" });
    openList();
    expect(listNames()).toEqual(["Albanais", "Allemand", "Anglais", "Français", "Russe", "Turc"]);
    expect(screen.getAllByRole("option").map((item) => item.getAttribute("data-key"))).not.toEqual(englishOrder);
  });
});

describe("LanguageSwitcher keyboard and layouts", () => {
  it("moves with the arrow keys and chooses with Enter", () => {
    const { onSelect } = renderSwitcher({ current: "en" });
    openList();

    const listbox = screen.getByRole("listbox");
    // English is selected and focused; the next option by English name is German.
    fireEvent.keyDown(listbox, { key: "ArrowDown" });
    fireEvent.keyDown(document.activeElement!, { key: "Enter" });

    expect(onSelect).toHaveBeenCalledWith("de");
  });

  it("collapsed with a mark: the mark alone shows, and the name stays for screen readers", () => {
    renderSwitcher({ current: "tr", label: "Language", collapsed: true, renderMark: mark });
    const trigger = screen.getByRole("button", { name: "Language" });

    expect(trigger.querySelector('[data-slot="language-mark"]')?.textContent).toBe("[tr]");
    expect(trigger.querySelector(".sr-only")?.textContent).toBe(languageName("tr", "tr"));
    expect(trigger.querySelector(".truncate")).toBeNull();
  });

  it("collapsed without a mark: the name stays visible, there is nothing else to show", () => {
    renderSwitcher({ current: "de", label: "Language", collapsed: true });
    const trigger = screen.getByRole("button", { name: "Language" });

    expect(trigger.querySelector('[data-slot="language-mark"]')).toBeNull();
    expect(trigger.querySelector(".sr-only")).toBeNull();
    expect(trigger.textContent).toBe("Deutsch");
  });

  it("collapsed and still resolving: the disabled trigger follows the same rule", () => {
    renderSwitcher({ current: "de", label: "Language", collapsed: true, loading: true, renderMark: mark });
    const withMark = screen.getByRole("button", { name: "Language" });
    expect(withMark.hasAttribute("disabled")).toBe(true);
    expect(withMark.querySelector('[data-slot="language-mark"]')?.textContent).toBe("[de]");
    expect(withMark.querySelector(".sr-only")?.textContent).toBe("Deutsch");
    cleanup();

    renderSwitcher({ current: "de", label: "Language", collapsed: true, loading: true });
    expect(screen.getByRole("button", { name: "Language" }).querySelector(".sr-only")).toBeNull();
  });

  it("fills the sidebar row", () => {
    renderSwitcher({ sidebar: true });
    expect(screen.getByRole("button", { name: "Language" }).className.split(/\s+/)).toContain("w-full");
  });
});

/** The design system ships no flags: a mark before the name is the app's, through `renderMark`. */
describe("LanguageSwitcher renderMark", () => {
  it("shows no mark by default: the name alone, in the trigger and in every row", () => {
    renderSwitcher();
    openList();

    expect(document.querySelector('[data-slot="language-mark"]')).toBeNull();
    for (const item of screen.getAllByRole("option")) {
      expect(item.querySelector('[data-slot="language-label"]')!.children).toHaveLength(1);
    }
  });

  it("renders each row's own mark before its name, hidden from assistive technology", () => {
    const renderMark = vi.fn(mark);
    renderSwitcher({ current: "en", sidebar: true, renderMark });
    openList();

    for (const locale of LOCALES) {
      const name = languageName(locale, "en");
      // The option is still named by the name alone: the mark adds nothing to it.
      const item = screen.getByRole("option", { name });
      const label = item.querySelector('[data-slot="language-label"]')!;
      const slot = label.querySelector('[data-slot="language-mark"]');
      expect(slot).not.toBeNull();
      expect(slot!.getAttribute("aria-hidden")).toBe("true");
      expect(slot!.textContent).toBe(`[${locale}]`);
      expect(label.firstElementChild).toBe(slot);
      expect(label.textContent).toBe(`[${locale}]${name}`);
    }
    expect(new Set(renderMark.mock.calls.map(([locale]) => locale))).toEqual(new Set(LOCALES));
  });

  it("gives the trigger the current language's mark, before its name", () => {
    renderSwitcher({ current: "tr", label: "Language", renderMark: mark });

    const trigger = screen.getByRole("button", { name: "Language" });
    const slot = trigger.querySelector('[data-slot="language-mark"]');
    expect(slot?.getAttribute("aria-hidden")).toBe("true");
    expect(trigger.textContent).toBe(`[tr]${languageName("tr", "tr")}`);
    expect(trigger.querySelector(".sr-only")).toBeNull();
  });
});

describe("LanguageLabel", () => {
  it("shows the name alone, with no mark slot, when there is no mark", () => {
    render(<LanguageLabel locale="de" uiLocale="en" />);
    const label = document.querySelector('[data-slot="language-label"]')!;
    expect(label.textContent).toBe("German");
    expect(label.querySelector('[data-slot="language-mark"]')).toBeNull();
  });

  it("shows the mark, then the name", () => {
    render(<LanguageLabel locale="de" uiLocale="en" mark={<svg data-testid="mark" />} />);
    const label = document.querySelector('[data-slot="language-label"]')!;
    const slot = label.querySelector('[data-slot="language-mark"]')!;
    expect(label.firstElementChild).toBe(slot);
    expect(slot.contains(screen.getByTestId("mark"))).toBe(true);
    expect(slot.nextElementSibling?.textContent).toBe("German");
  });

  it("hides the mark from assistive technology", () => {
    render(<LanguageLabel locale="de" uiLocale="en" mark="DE" />);
    expect(document.querySelector('[data-slot="language-mark"]')!.getAttribute("aria-hidden")).toBe("true");
  });

  it("with its name hidden shows the mark alone and keeps the name for screen readers", () => {
    render(<LanguageLabel locale="de" uiLocale="en" hideName mark="DE" />);
    expect(document.querySelector('[data-slot="language-mark"]')!.textContent).toBe("DE");
    expect(document.querySelector(".sr-only")!.textContent).toBe("German");
  });

  it("names the language in the UI language it is given", () => {
    render(<LanguageLabel locale="de" uiLocale="fr" />);
    expect(document.querySelector('[data-slot="language-label"]')!.textContent).toBe("Allemand");
  });
});

/**
 * Names the runtime gets wrong or does not have are the app's data. "me" (Montenegrin, as some products tag
 * it) is the example: Intl has no name for the tag, and calls its usual stand-in Serbian.
 *
 * The name registry and the alias table have no reset, so these tests keep to tags the rest of the file never
 * registers, and run in this order: unregistered first, then aliased, then registered.
 */
describe("LanguageSwitcher with app-registered names", () => {
  const locales = ["en", "me", "de"] as const;

  it("unregistered and unaliased, a tag Intl cannot name shows as the tag", () => {
    renderSwitcher({ locales, current: "en" });
    openList();

    expect(screen.queryByText("Montenegrin")).toBeNull();
    // Compared without case: the tag goes through the same capitalization as a name.
    expect(listNames().map((name) => name?.toLowerCase())).toEqual(["english", "german", "me"]);
  });

  it("unregistered but aliased, it shows what Intl calls the alias", () => {
    registerLocaleAliases({ me: "sr-Latn-ME" });

    renderSwitcher({ locales, current: "en" });
    openList();

    expect(screen.queryByText("Montenegrin")).toBeNull();
    expect(listNames()).toEqual(["English", "German", "Serbian (Latin, Montenegro)"]);
  });

  it("registered, the switcher shows the app's names", () => {
    registerLanguageNames("en-GB", { me: "Montenegrin" });
    registerLanguageNames("me", { me: "Crnogorski", en: "Engleski" });

    const { onSelect } = renderSwitcher({ locales, current: "en-GB" });
    openList();
    expect(listNames()).toEqual(["English", "German", "Montenegrin"]);
    fireEvent.click(screen.getByRole("option", { name: "Montenegrin" }));
    expect(onSelect).toHaveBeenCalledWith("me");
    cleanup();

    // In its own UI: the registered names, in the trigger too.
    renderSwitcher({ locales, current: "me" });
    expect(screen.getByRole("button", { name: "Language" }).textContent).toBe("Crnogorski");
    openList();
    expect(screen.getByRole("option", { name: "Crnogorski", selected: true })).toBeTruthy();
    expect(screen.getByRole("option", { name: "Engleski" })).toBeTruthy();
    expect(screen.queryByText("Montenegrin")).toBeNull();
    expect(screen.queryByText("English")).toBeNull();
  });

  it("a UI language with registered names uses them, and Intl for the rest", () => {
    // Albanian: a UI language whose display names not every browser ships. Each registered name differs from
    // what Intl gives here ("anglisht", nothing for "me"), so the list shows which source answered.
    registerLanguageNames("sq", { en: "Anglishtja", me: "Malazezisht", sq: "Shqip" });

    renderSwitcher({ locales: ["sq", "de", "me", "en"], current: "sq" });
    expect(screen.getByRole("button", { name: "Language" }).textContent).toBe("Shqip");
    openList();

    // "de" is not registered: Intl's "gjermanisht", capitalized. Sorted by these visible names.
    expect(listNames()).toEqual(["Anglishtja", "Gjermanisht", "Malazezisht", "Shqip"]);
    expect(screen.queryByText("Anglisht")).toBeNull();
  });
});

describe("LanguageSwitcher collapsed with no mark for the current language", () => {
  it("keeps the name visible when renderMark returns nothing, so the trigger is never empty", () => {
    renderSwitcher({ collapsed: true, renderMark: (locale) => (locale === "de" ? mark(locale) : null) });
    const trigger = screen.getByRole("button", { name: "Language" });
    expect(trigger.querySelector('[data-slot="language-mark"]')).toBeNull();
    const name = trigger.querySelector('[data-slot="language-label"] > span:last-child')!;
    expect(name.className).not.toContain("sr-only");
    expect(name.textContent).toBe("English");
  });
});
