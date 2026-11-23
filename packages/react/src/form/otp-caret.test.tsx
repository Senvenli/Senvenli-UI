import * as React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { DesignSystemProvider } from "../provider";
import { OtpField } from "./index";

// OtpField's caret: one element for the row that slides to the active box, never one per box.

afterEach(cleanup);

const caret = () => document.querySelector<HTMLElement>('[data-slot="otp-field-caret"]')!;

describe("OtpField caret", () => {
  it("is one caret for the row, shown only while the field is focused and the code is not full", () => {
    render(
      <DesignSystemProvider>
        <OtpField label="Code" length={4} />
      </DesignSystemProvider>,
    );
    const input = screen.getByRole("textbox", { name: "Code" });
    expect(document.querySelectorAll('[data-slot="otp-field-caret"]')).toHaveLength(1);
    expect(caret().getAttribute("aria-hidden")).toBe("true");
    expect(caret().hasAttribute("data-visible")).toBe(false);
    act(() => input.focus());
    expect(caret().hasAttribute("data-visible")).toBe(true);
    expect(caret().dataset.index).toBe("0");
    fireEvent.change(input, { target: { value: "12" } });
    expect(caret().dataset.index).toBe("2");
    fireEvent.change(input, { target: { value: "1" } });
    expect(caret().dataset.index).toBe("1");
    fireEvent.change(input, { target: { value: "1234" } });
    expect(caret().hasAttribute("data-visible")).toBe(false);
    act(() => input.blur());
    fireEvent.change(input, { target: { value: "12" } });
    expect(caret().hasAttribute("data-visible")).toBe(false);
  });

  it("slides with a transition that reduced motion turns off, and blinks only while shown", () => {
    render(
      <DesignSystemProvider>
        <OtpField label="Code" />
      </DesignSystemProvider>,
    );
    const classes = caret().className.split(/\s+/);
    expect(classes).toEqual(expect.arrayContaining(["transition-[translate]", "motion-reduce:transition-none", "data-[visible]:animate-pulse", "motion-reduce:data-[visible]:animate-none"]));
    expect(caret().style.translate).toMatch(/px -50%$/);
  });

  it("takes its own motion setting", () => {
    render(
      <DesignSystemProvider>
        <OtpField label="Code" motion="none" />
      </DesignSystemProvider>,
    );
    expect(caret().closest("[data-ds-motion]")?.getAttribute("data-ds-motion")).toBe("none");
  });
});
