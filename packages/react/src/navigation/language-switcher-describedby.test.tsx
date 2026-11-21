import * as React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { LanguageSwitcher, languageName } from "./index";

// An app describes the language trigger ("Changes the language of the whole panel.") with aria-describedby.
// It lands on the trigger button, the focusable control, through React Aria's Select
// (useSelect → useField → trigger props), and on the disabled trigger while loading.

afterEach(cleanup);

beforeAll(() => {
  // jsdom implements none of these; React Aria's listbox and popover call them while opening.
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  globalThis.CSS ??= {} as typeof CSS;
  CSS.escape ??= (value: string) => value.replace(/[^\w-]/g, (char) => `\\${char}`);
});

const LOCALES = ["en", "tr", "ar", "ru"] as const;
type Locale = (typeof LOCALES)[number];
const HINT = "Changes the language of the whole panel.";
/** No `label` is passed anywhere in this file: the trigger is named by the design system's own string. */
const LABEL = "Language";

type Extra = { loading?: boolean; sidebar?: boolean; collapsed?: boolean; size?: "default" | "sm"; "aria-describedby"?: string };

function renderSwitcher(extra: Extra = {}, { locale = "en", dir, current = "en" }: { locale?: string; dir?: "rtl"; current?: Locale } = {}) {
  const onSelect = vi.fn();
  const view = render(
    <div dir={dir}>
      <DesignSystemProvider locale={locale} navigate={vi.fn()}>
        <p id="language-hint">{HINT}</p>
        <LanguageSwitcher locales={LOCALES} current={current} onSelect={onSelect} {...extra} />
      </DesignSystemProvider>
    </div>,
  );
  return { onSelect, ...view };
}

const described = () => Array.from(document.querySelectorAll("[aria-describedby]"));

/** Generated ids (React's useId, React Aria's) numbered by first appearance, so two renders compare byte for byte. */
function stableIds(html: string) {
  const seen = new Map<string, string>();
  return html.replace(/_r_[0-9a-z]+_|react-aria\d*-\d+/g, (id) => {
    if (!seen.has(id)) seen.set(id, `id${seen.size}`);
    return seen.get(id)!;
  });
}

/**
 * With the list open on the current language, moves one option by keyboard (down, or up from the last one) and
 * chooses it with Enter. Returns the locale of the option chosen, read from its visible name.
 */
function chooseNeighbourByKeyboard(uiLocale: string) {
  const options = screen.getAllByRole("option");
  const index = options.findIndex((option) => option.getAttribute("aria-selected") === "true");
  expect(document.activeElement).toBe(options[index]);
  const target = index < options.length - 1 ? options[index + 1]! : options[index - 1]!;
  fireEvent.keyDown(document.activeElement!, { key: index < options.length - 1 ? "ArrowDown" : "ArrowUp" });
  expect(document.activeElement).toBe(target);
  fireEvent.keyDown(target, { key: "Enter" });
  fireEvent.keyUp(target, { key: "Enter" });
  return LOCALES.find((locale) => target.textContent!.includes(languageName(locale, uiLocale)));
}

describe("LanguageSwitcher aria-describedby", () => {
  it("lands on the trigger button, the focusable control, and nowhere else", () => {
    renderSwitcher({ "aria-describedby": "language-hint" });
    const trigger = screen.getByRole("button", { name: LABEL, description: HINT });
    expect(trigger.tagName).toBe("BUTTON");
    expect(trigger.getAttribute("data-slot")).toBe("language-switcher-trigger");
    expect(trigger.getAttribute("aria-describedby")).toBe("language-hint");
    // Not the Select wrapper, not the hidden native select, not the list.
    expect(described()).toEqual([trigger]);
  });

  it("keeps several ids, in order", () => {
    renderSwitcher({ "aria-describedby": "language-hint other-hint" });
    expect(screen.getByRole("button", { name: LABEL }).getAttribute("aria-describedby")).toBe("language-hint other-hint");
  });

  it("while loading, the disabled trigger carries it too", () => {
    renderSwitcher({ "aria-describedby": "language-hint", loading: true });
    const trigger = screen.getByRole("button", { name: LABEL, description: HINT });
    expect(trigger.hasAttribute("disabled")).toBe(true);
    expect(described()).toEqual([trigger]);
  });

  it("every layout: sidebar, collapsed, compact", () => {
    for (const extra of [{ sidebar: true }, { collapsed: true }, { sidebar: true, collapsed: true }, { size: "sm" as const }]) {
      renderSwitcher({ ...extra, "aria-describedby": "language-hint" });
      expect(described(), JSON.stringify(extra)).toEqual([screen.getByRole("button", { name: LABEL, description: HINT })]);
      cleanup();
    }
  });

  it("left out, nothing is added: no aria-describedby, and the DOM is byte-identical to aria-describedby={undefined}", () => {
    for (const extra of [{}, { loading: true }, { sidebar: true }, { collapsed: true }, { size: "sm" as const }] as Extra[]) {
      const omitted = stableIds(renderSwitcher(extra).container.innerHTML);
      expect(described(), JSON.stringify(extra)).toEqual([]);
      cleanup();
      const undefinedProp = stableIds(renderSwitcher({ ...extra, "aria-describedby": undefined }).container.innerHTML);
      cleanup();
      expect(undefinedProp, JSON.stringify(extra)).toBe(omitted);
    }
  });

  it("keyboard: the described trigger takes focus, Enter opens the list, arrows and Enter choose", async () => {
    const { onSelect } = renderSwitcher({ "aria-describedby": "language-hint" });
    const trigger = screen.getByRole("button", { name: LABEL, description: HINT });
    fireEvent.keyDown(document.body, { key: "Tab" });
    act(() => trigger.focus());
    expect(document.activeElement).toBe(trigger);
    fireEvent.keyDown(trigger, { key: "Enter" });
    fireEvent.keyUp(trigger, { key: "Enter" });
    const listbox = screen.getByRole("listbox");
    expect(listbox.hasAttribute("aria-describedby")).toBe(false);
    expect(screen.getByRole("option", { selected: true }).textContent).toContain(languageName("en", "en"));
    const chosen = chooseNeighbourByKeyboard("en");
    expect(chosen).toBeDefined();
    expect(chosen).not.toBe("en");
    expect(onSelect.mock.calls).toEqual([[chosen]]);
    // Closed again, focus back on the trigger, which is still described.
    expect(screen.queryByRole("listbox")).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: LABEL, description: HINT })));
  });

  it("tooltip open on keyboard focus: the caller's hint describes the trigger; left out, the tooltip still does", () => {
    // The tooltip repeats the label. React Aria merges the Select's trigger props over the tooltip trigger's,
    // so a given aria-describedby takes the tooltip id's place while it is open; without one the trigger is
    // described by the open tooltip (see the component's prop doc).
    vi.useFakeTimers();
    try {
      for (const hint of ["language-hint", undefined]) {
        renderSwitcher({ "aria-describedby": hint });
        const trigger = screen.getByRole("button", { name: LABEL });
        fireEvent.keyDown(document.body, { key: "Tab" });
        act(() => trigger.focus());
        act(() => vi.advanceTimersByTime(1_000));
        const tooltip = screen.getByRole("tooltip");
        expect(tooltip.textContent).toBe(LABEL);
        expect(trigger.getAttribute("aria-describedby"), String(hint)).toBe(hint ?? tooltip.id);
        cleanup();
      }
    } finally {
      vi.useRealTimers();
    }
  });

  it("right to left, in Arabic: lands on the trigger, the list opens and chooses by keyboard", () => {
    const { onSelect } = renderSwitcher({ "aria-describedby": "language-hint" }, { locale: "ar", dir: "rtl", current: "ar" });
    // No Arabic strings are registered here, so the label is the English fallback.
    const trigger = screen.getByRole("button", { name: LABEL, description: HINT });
    expect(described()).toEqual([trigger]);
    expect(trigger.closest("[dir]")!.getAttribute("dir")).toBe("rtl");
    fireEvent.keyDown(trigger, { key: "Enter" });
    fireEvent.keyUp(trigger, { key: "Enter" });
    expect(screen.getByRole("option", { selected: true }).textContent).toContain(languageName("ar", "ar"));
    const chosen = chooseNeighbourByKeyboard("ar");
    expect(chosen).toBeDefined();
    expect(chosen).not.toBe("ar");
    expect(onSelect.mock.calls).toEqual([[chosen]]);
  });
});
