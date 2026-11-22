import * as React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { OtpField } from "./index";
import { TextField } from "./text-field";

/**
 * Codes, PINs and phone numbers read left to right inside an RTL UI: on a `dir="rtl"`
 * page the PIN 1234 must not show as "4 3 2 1", nor "US +1 555 010 4477" as "4477 010 555 US +1".
 */

afterEach(cleanup);

const PHYSICAL = /(^|\s|:)(-?m[lr]-|p[lr]-|left-|right-|border-[lr](-|\s|$)|rounded-[lr]-|text-left|text-right)/;

function inRtl(ui: React.ReactElement) {
  return render(
    <div dir="rtl" lang="ar">
      <DesignSystemProvider locale="ar" navigate={vi.fn()}>{ui}</DesignSystemProvider>
    </div>,
  );
}

/** The direction an element inherits: its own `dir`, else its nearest ancestor's. */
function directionOf(element: Element) {
  return element.closest("[dir]")?.getAttribute("dir");
}

function classesOf(element: Element | null) {
  return element?.getAttribute("class") ?? "";
}

describe("OtpField on an RTL page", () => {
  it("lays the cells, separator and hidden input out left to right", () => {
    inRtl(<OtpField label="Code" defaultValue="123456" />);
    const row = document.querySelector('[data-slot="otp-field-boxes"]')!;
    expect(row.getAttribute("dir")).toBe("ltr");
    const boxes = Array.from(document.querySelectorAll('[data-slot="otp-field-box"]'));
    for (const part of [...boxes, document.querySelector('[data-slot="otp-field-separator"]')!, screen.getByRole("textbox", { name: "Code" })]) {
      expect(directionOf(part), part.getAttribute("data-slot") ?? "").toBe("ltr");
    }
    // In an LTR row, DOM order is the visual order from the left: the first digit is the leftmost cell.
    expect(boxes.map((box) => box.textContent)).toEqual(["1", "2", "3", "4", "5", "6"]);
  });

  it("leaves the label, description and error with the page direction", () => {
    inRtl(<OtpField label="PIN" length={4} isInvalid defaultValue="1234" description="Four digits." errorMessage="Wrong PIN." />);
    const field = document.querySelector('[data-slot="otp-field"]')!;
    expect(field.hasAttribute("dir")).toBe(false);
    for (const text of ["PIN", "Four digits.", "Wrong PIN."]) expect(directionOf(screen.getByText(text))).toBe("rtl");
  });

  it("keeps its classes logical, so nothing is pinned to a physical side", () => {
    inRtl(<OtpField label="Code" />);
    const parts = document.querySelectorAll('[data-slot^="otp-field"]');
    expect(parts.length).toBeGreaterThan(6);
    for (const part of Array.from(parts)) expect(classesOf(part), part.getAttribute("data-slot") ?? "").not.toMatch(PHYSICAL);
  });

  it("ArrowLeft and ArrowRight keep the caret on the next empty cell, right of the typed digits", () => {
    inRtl(<OtpField label="PIN" length={4} />);
    const input = screen.getByRole("textbox", { name: "PIN" }) as HTMLInputElement;
    act(() => input.focus());
    fireEvent.change(input, { target: { value: "12" } });
    const active = () => Array.from(document.querySelectorAll('[data-slot="otp-field-box"]')).findIndex((box) => box.hasAttribute("data-active"));
    expect(active()).toBe(2);
    for (const key of ["ArrowLeft", "ArrowRight", "ArrowLeft", "Home"]) {
      // The browser moves the caret on keydown; the field puts it back on keyup.
      fireEvent.keyDown(input, { key });
      input.setSelectionRange(key === "ArrowRight" ? 2 : 0, key === "ArrowRight" ? 2 : 0);
      fireEvent.keyUp(input, { key });
      expect(input.selectionStart, key).toBe(2);
      expect(active(), key).toBe(2);
    }
    // Typing continues in the cell to the right of "2", not a mirrored one.
    fireEvent.change(input, { target: { value: "123" } });
    expect(active()).toBe(3);
    expect(Array.from(document.querySelectorAll('[data-slot="otp-field-box"]')).map((box) => box.textContent)).toEqual(["1", "2", "3", ""]);
  });
});

describe("TextField valueDir on an RTL page", () => {
  it('keeps the frame, addon and value left to right with valueDir="ltr"', () => {
    inRtl(<TextField label="Phone" prefix="US +1" appearance="numeric" valueDir="ltr" defaultValue="555 010 4477" description="We will call before delivery." />);
    const frame = document.querySelector('[data-slot="input-group"]')!;
    expect(frame.getAttribute("dir")).toBe("ltr");
    const addon = document.querySelector('[data-slot="input-addon"]')!;
    const input = screen.getByRole("textbox", { name: "Phone" });
    expect(directionOf(addon)).toBe("ltr");
    expect(directionOf(input)).toBe("ltr");
    // The addon comes first in an LTR frame: it sits on the left of the number.
    expect(addon.compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(directionOf(screen.getByText("Phone"))).toBe("rtl");
    expect(directionOf(screen.getByText("We will call before delivery."))).toBe("rtl");
  });

  it("follows the page without valueDir", () => {
    inRtl(<TextField label="Price" prefix="€" defaultValue="62.00" />);
    expect(document.querySelector('[data-slot="input-group"]')!.hasAttribute("dir")).toBe(false);
    expect(directionOf(screen.getByRole("textbox", { name: "Price" }))).toBe("rtl");
  });

  it("keeps the frame's classes logical", () => {
    inRtl(<TextField label="Phone" prefix="US +1" valueDir="ltr" />);
    for (const slot of ["input-group", "input-addon", "text-field-input"]) {
      expect(classesOf(document.querySelector(`[data-slot="${slot}"]`)), slot).not.toMatch(PHYSICAL);
    }
  });
});
