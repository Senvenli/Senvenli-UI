import * as React from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { Dialog } from "./index";

afterEach(cleanup);

const PHYSICAL = /(^|\s|:)(-?m[lr]-|p[lr]-|-?left-|-?right-|border-[lr](-|\s|$)|rounded-[lr]-|text-left|text-right)/;

function inLocale(ui: React.ReactElement, locale = "en", dir?: "rtl") {
  return render(
    <div dir={dir}>
      <DesignSystemProvider locale={locale} navigate={vi.fn()}>{ui}</DesignSystemProvider>
    </div>,
  );
}

function press(key: string, target: Element) {
  fireEvent.keyDown(target, { key });
  fireEvent.keyUp(target, { key });
}

describe("Dialog actions isDisabled", () => {
  it("disabled primary and secondary actions cannot be pressed by pointer or keyboard", () => {
    const onPrimary = vi.fn();
    const onSecondary = vi.fn();
    inLocale(
      <Dialog
        defaultOpen
        title="Save note"
        primaryAction={{ label: "Save", onPress: onPrimary, isDisabled: true }}
        secondaryAction={{ label: "Back", onPress: onSecondary, isDisabled: true }}
      >
        Body
      </Dialog>,
    );
    const dialog = screen.getByRole("dialog");
    const primary = within(dialog).getByRole("button", { name: "Save" });
    const secondary = within(dialog).getByRole("button", { name: "Back" });
    for (const button of [primary, secondary]) {
      expect(button.hasAttribute("disabled")).toBe(true);
      expect(button.hasAttribute("data-disabled")).toBe(true);
      fireEvent.click(button);
      press("Enter", button);
      press(" ", button);
    }
    expect(onPrimary).not.toHaveBeenCalled();
    expect(onSecondary).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("enabled by default: the actions press as before", () => {
    const onPrimary = vi.fn();
    inLocale(<Dialog defaultOpen title="Save note" primaryAction={{ label: "Save", onPress: onPrimary }}>Body</Dialog>);
    const primary = screen.getByRole("button", { name: "Save" });
    expect(primary.hasAttribute("disabled")).toBe(false);
    expect(screen.getByRole("button", { name: "Cancel" }).hasAttribute("disabled")).toBe(false);
    act(() => primary.focus());
    press("Enter", primary);
    expect(onPrimary).toHaveBeenCalledTimes(1);
  });
});

describe("Dialog description", () => {
  it("renders under the title and describes the dialog only when given", () => {
    inLocale(
      <Dialog defaultOpen title="Move order" description="The customer gets the new date by email.">
        Body
      </Dialog>,
    );
    const dialog = screen.getByRole("dialog", { name: "Move order" });
    const description = dialog.querySelector("[data-slot='dialog-description']");
    expect(description?.textContent).toBe("The customer gets the new date by email.");
    expect(description?.id).toBeTruthy();
    expect(dialog.getAttribute("aria-describedby")).toBe(description?.id);
    // Under the title, inside the header.
    const heading = dialog.querySelector("[data-slot='dialog-heading']");
    expect(heading?.parentElement?.getAttribute("data-slot")).toBe("dialog-header");
    expect(heading?.firstElementChild?.getAttribute("data-slot")).toBe("dialog-title");
    expect(heading?.lastElementChild).toBe(description);
    expect(description?.className).toContain("text-ds-text-subtle");
    expect(description?.className).not.toMatch(PHYSICAL);
    expect(heading?.className).not.toMatch(PHYSICAL);
  });

  it("without a description: no aria-describedby, no extra nodes, the title sits in the header", () => {
    inLocale(<Dialog defaultOpen title="Move order">Body</Dialog>);
    const dialog = screen.getByRole("dialog");
    expect(dialog.hasAttribute("aria-describedby")).toBe(false);
    expect(dialog.querySelector("[data-slot='dialog-description']")).toBeNull();
    expect(dialog.querySelector("[data-slot='dialog-heading']")).toBeNull();
    const header = dialog.querySelector("[data-slot='dialog-header']");
    expect(header?.firstElementChild?.getAttribute("data-slot")).toBe("dialog-title");
    expect(header?.children).toHaveLength(2);
  });

  it("works in RTL", () => {
    inLocale(<Dialog defaultOpen title="نقل الطلب" description="سيصل البريد إلى العميل.">Body</Dialog>, "ar-AE", "rtl");
    const dialog = screen.getByRole("dialog", { name: "نقل الطلب" });
    expect(dialog.getAttribute("aria-describedby")).toBe(dialog.querySelector("[data-slot='dialog-description']")?.id);
  });
});

describe("Dialog empty description", () => {
  it('description="" or false is the same as none: no node, no aria-describedby, same header', () => {
    inLocale(<Dialog defaultOpen title="Move order">Body</Dialog>);
    const plainHeader = screen.getByRole("dialog").querySelector("[data-slot='dialog-header']")!.innerHTML;
    cleanup();
    for (const description of ["", false, null] as const) {
      inLocale(<Dialog defaultOpen title="Move order" description={description}>Body</Dialog>);
      const dialog = screen.getByRole("dialog");
      expect(dialog.hasAttribute("aria-describedby"), String(description)).toBe(false);
      expect(dialog.querySelector("[data-slot='dialog-description']"), String(description)).toBeNull();
      expect(dialog.querySelector("[data-slot='dialog-heading']"), String(description)).toBeNull();
      const ids = (html: string) => html.replace(/_r_[0-9a-z]+_/g, "");
      expect(ids(dialog.querySelector("[data-slot='dialog-header']")!.innerHTML)).toBe(ids(plainHeader));
      cleanup();
    }
  });

  it("an empty description is absent in RTL too", () => {
    inLocale(<Dialog defaultOpen title="نقل الطلب" description="">Body</Dialog>, "ar-AE", "rtl");
    const dialog = screen.getByRole("dialog", { name: "نقل الطلب" });
    expect(dialog.hasAttribute("aria-describedby")).toBe(false);
  });
});
