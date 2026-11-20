import * as React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { Switch, type SwitchProps } from "./index";

// An app marks a Switch whose change is being saved with aria-busy. React Aria's Switch forwards
// only labelling props to its input (useToggle → filterDOMProps labelable), so aria-busy passed to it was
// dropped; the DS Switch now sets it on the input, the role="switch" element screen readers read.

afterEach(cleanup);

function inLocale(ui: React.ReactElement, locale = "en", dir?: "rtl") {
  return render(
    <div dir={dir}>
      <DesignSystemProvider locale={locale} navigate={vi.fn()}>
        {ui}
      </DesignSystemProvider>
    </div>,
  );
}

/** Keyboard modality first, so React Aria treats the focus as keyboard focus. */
function keyboardFocus(element: HTMLElement) {
  fireEvent.keyDown(document.body, { key: "Tab" });
  act(() => element.focus());
}

/** Space on a focused checkbox, as a browser delivers it: keydown, keyup, then the native click (jsdom has no activation). */
function pressSpace(element: HTMLElement) {
  fireEvent.keyDown(element, { key: " ", code: "Space" });
  fireEvent.keyUp(element, { key: " ", code: "Space" });
  fireEvent.click(element);
}

/** A real mouse press: React Aria handles label presses through pointer events, not a bare click. */
function pointerPress(element: Element) {
  const pointer = { pointerType: "mouse", pointerId: 1, detail: 1, buttons: 1, width: 1, height: 1 };
  fireEvent.pointerDown(element, pointer);
  fireEvent.mouseDown(element, { detail: 1, buttons: 1 });
  fireEvent.pointerUp(element, { ...pointer, buttons: 0 });
  fireEvent.mouseUp(element, { detail: 1 });
  fireEvent.click(element, { detail: 1 });
}

const busyElements = () => Array.from(document.querySelectorAll("[aria-busy]"));

/** Generated ids (React's useId, React Aria's) numbered by first appearance, so two renders compare byte for byte. */
function stableIds(html: string) {
  const seen = new Map<string, string>();
  return html.replace(/_r_[0-9a-z]+_|react-aria\d*-\d+/g, (id) => {
    if (!seen.has(id)) seen.set(id, `id${seen.size}`);
    return seen.get(id)!;
  });
}

describe("Switch aria-busy", () => {
  it("lands on the role=switch input, not on the row label, and screen readers find it busy", () => {
    inLocale(
      <Switch aria-busy description="Visitors can sign up from your website.">
        Public sign-up
      </Switch>,
    );
    const toggle = screen.getByRole("switch", { name: "Public sign-up", busy: true, description: "Visitors can sign up from your website." });
    expect(toggle.tagName).toBe("INPUT");
    expect(toggle.getAttribute("aria-busy")).toBe("true");
    expect(busyElements()).toEqual([toggle]);
    expect(document.querySelector('[data-slot="switch"]')!.hasAttribute("aria-busy")).toBe(false);
  });

  it("renders the value as React would: \"true\", \"false\", and the string forms", () => {
    const { rerender } = inLocale(<Switch aria-busy={false}>Online</Switch>);
    expect(screen.getByRole("switch", { busy: false }).getAttribute("aria-busy")).toBe("false");
    rerender(
      <DesignSystemProvider locale="en" navigate={vi.fn()}>
        <Switch aria-busy="true">Online</Switch>
      </DesignSystemProvider>,
    );
    expect(screen.getByRole("switch", { busy: true }).getAttribute("aria-busy")).toBe("true");
  });

  it("follows the prop: busy, done, then left out removes the attribute", () => {
    const ui = (busy?: boolean) => (
      <DesignSystemProvider locale="en" navigate={vi.fn()}>
        <Switch aria-busy={busy}>Online</Switch>
      </DesignSystemProvider>
    );
    const { rerender } = render(ui(true));
    expect(screen.getByRole("switch").getAttribute("aria-busy")).toBe("true");
    rerender(ui(false));
    expect(screen.getByRole("switch").getAttribute("aria-busy")).toBe("false");
    rerender(ui(undefined));
    expect(screen.getByRole("switch").hasAttribute("aria-busy")).toBe(false);
    expect(busyElements()).toEqual([]);
  });

  it("left out, the DOM is byte-identical to aria-busy={undefined} and carries no aria-busy anywhere", () => {
    const cases: [string, SwitchProps][] = [
      ["plain", { children: "Email notifications" }],
      ["described", { children: "Public sign-up", description: "Visitors can sign up from your website.", defaultSelected: true }],
      ["disabled", { children: "Automatic renewal", isDisabled: true }],
    ];
    for (const [name, props] of cases) {
      const omitted = stableIds(inLocale(<Switch {...props} />).container.innerHTML);
      cleanup();
      const undefinedProp = stableIds(inLocale(<Switch {...props} aria-busy={undefined} />).container.innerHTML);
      expect(busyElements(), name).toEqual([]);
      cleanup();
      expect(undefinedProp, name).toBe(omitted);
    }
  });

  it("stays interactive by default: a busy switch still toggles by pointer", () => {
    const onChange = vi.fn();
    inLocale(
      <Switch aria-busy onChange={onChange}>
        Public sign-up
      </Switch>,
    );
    const toggle = screen.getByRole("switch", { name: "Public sign-up", busy: true }) as HTMLInputElement;
    expect(toggle.disabled).toBe(false);
    fireEvent.click(toggle);
    expect(onChange).toHaveBeenLastCalledWith(true);
    expect(toggle.checked).toBe(true);
    // Still busy after the change: the caller, not the click, ends the pending state.
    expect(toggle.getAttribute("aria-busy")).toBe("true");
  });

  it("keyboard: Tab reaches a busy switch, it shows focus, and Space toggles it", () => {
    const onChange = vi.fn();
    inLocale(
      <Switch aria-busy onChange={onChange}>
        Public sign-up
      </Switch>,
    );
    const toggle = screen.getByRole("switch", { name: "Public sign-up", busy: true });
    keyboardFocus(toggle);
    expect(document.activeElement).toBe(toggle);
    expect(document.querySelector('[data-slot="switch"]')!.hasAttribute("data-focus-visible")).toBe(true);
    pressSpace(toggle);
    expect(onChange).toHaveBeenLastCalledWith(true);
    pressSpace(toggle);
    expect(onChange).toHaveBeenLastCalledWith(false);
  });

  it("busy and isDisabled: does not toggle, and stays busy for screen readers", () => {
    const onChange = vi.fn();
    inLocale(
      <Switch aria-busy isDisabled onChange={onChange}>
        Automatic renewal
      </Switch>,
    );
    const toggle = screen.getByRole("switch", { name: "Automatic renewal", busy: true }) as HTMLInputElement;
    expect(toggle.disabled).toBe(true);
    pointerPress(screen.getByText("Automatic renewal"));
    expect(onChange).not.toHaveBeenCalled();
    expect(toggle.checked).toBe(false);
  });

  it("controlled: busy while the caller saves, the value follows the caller", () => {
    function Saving() {
      const [on, setOn] = React.useState(false);
      const [busy, setBusy] = React.useState(false);
      return (
        <>
          <Switch isSelected={on} aria-busy={busy || undefined} onChange={(next) => (setBusy(true), setOn(next))}>
            Public sign-up
          </Switch>
          <button type="button" onClick={() => setBusy(false)}>
            Saved
          </button>
        </>
      );
    }
    inLocale(<Saving />);
    fireEvent.click(screen.getByRole("switch", { name: "Public sign-up", busy: false }));
    expect(screen.getByRole("switch", { name: "Public sign-up", busy: true, checked: true })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Saved" }));
    expect(screen.getByRole("switch", { name: "Public sign-up", checked: true }).hasAttribute("aria-busy")).toBe(false);
  });

  it("RTL in ar: lands on the input, still toggles, and the label and description are unchanged", () => {
    const onChange = vi.fn();
    inLocale(
      <Switch aria-busy description="و" onChange={onChange}>
        ز
      </Switch>,
      "ar",
      "rtl",
    );
    const toggle = screen.getByRole("switch", { name: "ز", busy: true, description: "و" });
    expect(busyElements()).toEqual([toggle]);
    expect(toggle.closest("[dir]")!.getAttribute("dir")).toBe("rtl");
    fireEvent.click(toggle);
    expect(onChange).toHaveBeenLastCalledWith(true);
  });

  it("the forwarded ref is still the row label", () => {
    const ref = React.createRef<HTMLLabelElement>();
    inLocale(
      <Switch ref={ref} aria-busy>
        Online
      </Switch>,
    );
    expect(ref.current?.getAttribute("data-slot")).toBe("switch");
    expect(ref.current?.tagName).toBe("LABEL");
  });

  it("StrictMode (effects run twice): aria-busy is set once on the input, follows changes, and goes when removed", () => {
    const ui = (busy?: boolean) => (
      <React.StrictMode>
        <DesignSystemProvider locale="en" navigate={vi.fn()}>
          <Switch aria-busy={busy}>Online</Switch>
        </DesignSystemProvider>
      </React.StrictMode>
    );
    const { rerender } = render(ui(true));
    const toggle = screen.getByRole("switch", { busy: true });
    expect(busyElements()).toEqual([toggle]);
    rerender(ui(false));
    expect(toggle.getAttribute("aria-busy")).toBe("false");
    rerender(ui(undefined));
    expect(busyElements()).toEqual([]);
  });
});
