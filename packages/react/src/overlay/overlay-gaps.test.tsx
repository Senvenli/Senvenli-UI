import * as React from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { Dialog } from "./index";

afterEach(cleanup);

const PHYSICAL = /(^|\s|:)(-?m[lr]-|p[lr]-|-?left-|-?right-|border-[lr](-|\s|$)|rounded-[lr]-|text-left|text-right)/;

function inLocale(ui: React.ReactElement, locale = "tr-TR", dir?: "rtl") {
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

describe("Dialog actions isDisabled (RENENG-3460)", () => {
  it("disabled primary and secondary actions cannot be pressed by pointer or keyboard", () => {
    const onPrimary = vi.fn();
    const onSecondary = vi.fn();
    inLocale(
      <Dialog
        defaultOpen
        title="Notu kaydet"
        primaryAction={{ label: "Kaydet", onPress: onPrimary, isDisabled: true }}
        secondaryAction={{ label: "Geri", onPress: onSecondary, isDisabled: true }}
      >
        Gövde
      </Dialog>,
    );
    const dialog = screen.getByRole("dialog");
    const primary = within(dialog).getByRole("button", { name: "Kaydet" });
    const secondary = within(dialog).getByRole("button", { name: "Geri" });
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
    inLocale(<Dialog defaultOpen title="Notu kaydet" primaryAction={{ label: "Kaydet", onPress: onPrimary }}>Gövde</Dialog>);
    const primary = screen.getByRole("button", { name: "Kaydet" });
    expect(primary.hasAttribute("disabled")).toBe(false);
    expect(screen.getByRole("button", { name: "Vazgeç" }).hasAttribute("disabled")).toBe(false);
    act(() => primary.focus());
    press("Enter", primary);
    expect(onPrimary).toHaveBeenCalledTimes(1);
  });
});

describe("Dialog description (RENENG-3460)", () => {
  it("renders under the title and describes the dialog only when given", () => {
    inLocale(
      <Dialog defaultOpen title="Rezervasyonu taşı" description="Müşteriye yeni tarih e-postayla gider.">
        Gövde
      </Dialog>,
    );
    const dialog = screen.getByRole("dialog", { name: "Rezervasyonu taşı" });
    const description = dialog.querySelector("[data-slot='dialog-description']");
    expect(description?.textContent).toBe("Müşteriye yeni tarih e-postayla gider.");
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
    inLocale(<Dialog defaultOpen title="Rezervasyonu taşı">Gövde</Dialog>);
    const dialog = screen.getByRole("dialog");
    expect(dialog.hasAttribute("aria-describedby")).toBe(false);
    expect(dialog.querySelector("[data-slot='dialog-description']")).toBeNull();
    expect(dialog.querySelector("[data-slot='dialog-heading']")).toBeNull();
    const header = dialog.querySelector("[data-slot='dialog-header']");
    expect(header?.firstElementChild?.getAttribute("data-slot")).toBe("dialog-title");
    expect(header?.children).toHaveLength(2);
  });

  it("works in RTL", () => {
    inLocale(<Dialog defaultOpen title="نقل الحجز" description="سيصل البريد إلى العميل.">Gövde</Dialog>, "ar-AE", "rtl");
    const dialog = screen.getByRole("dialog", { name: "نقل الحجز" });
    expect(dialog.getAttribute("aria-describedby")).toBe(dialog.querySelector("[data-slot='dialog-description']")?.id);
  });
});

describe("Dialog empty description (RENENG-3460 review)", () => {
  it('description="" or false is the same as none: no node, no aria-describedby, same header', () => {
    inLocale(<Dialog defaultOpen title="Rezervasyonu taşı">Gövde</Dialog>);
    const plainHeader = screen.getByRole("dialog").querySelector("[data-slot='dialog-header']")!.innerHTML;
    cleanup();
    for (const description of ["", false, null] as const) {
      inLocale(<Dialog defaultOpen title="Rezervasyonu taşı" description={description}>Gövde</Dialog>);
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
    inLocale(<Dialog defaultOpen title="نقل الحجز" description="">Gövde</Dialog>, "ar-AE", "rtl");
    const dialog = screen.getByRole("dialog", { name: "نقل الحجز" });
    expect(dialog.hasAttribute("aria-describedby")).toBe(false);
  });
});
