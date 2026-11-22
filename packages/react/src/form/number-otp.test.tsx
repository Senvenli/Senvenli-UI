import * as React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { OtpField, TextArea } from "./index";
import { NumberField } from "./number-field";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function inLocale(ui: React.ReactElement, locale = "en") {
  return render(<DesignSystemProvider locale={locale} navigate={vi.fn()}>{ui}</DesignSystemProvider>);
}

/** Types into the field the way a user does: focus, replace the text, blur (commit). */
function typeAndCommit(input: HTMLInputElement, text: string) {
  act(() => input.focus());
  fireEvent.change(input, { target: { value: text } });
  act(() => input.blur());
}

describe("NumberField", () => {
  describe("typed grouping is never read as a decimal", () => {
    it.each([
      ["tr-TR", "1.500", 1500],
      ["en-US", "1,234.56", 1234.56],
      ["de-DE", "1.234,50", 1234.5],
      ["tr-TR", "090", 90],
      ["en-US", "090", 90],
    ])("%s parses %s as %s", (locale, text, expected) => {
      const onChange = vi.fn();
      inLocale(<NumberField label="Amount" onChange={onChange} />, locale);
      typeAndCommit(screen.getByRole("textbox", { name: "Amount" }) as HTMLInputElement, text);
      expect(onChange).toHaveBeenLastCalledWith(expected);
    });
  });

  it("focusing selects the value, so typing over a default 0 replaces it", () => {
    inLocale(<NumberField label="Quantity" defaultValue={0} />);
    const input = screen.getByRole("textbox", { name: "Quantity" }) as HTMLInputElement;
    act(() => input.focus());
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(input.value.length);
  });

  it("keeps a click's own selection when the field was already focused by keyboard", () => {
    inLocale(<NumberField label="Quantity" defaultValue={12} />);
    const input = screen.getByRole("textbox", { name: "Quantity" }) as HTMLInputElement;
    act(() => input.focus());
    fireEvent.mouseDown(input);
    expect(fireEvent.mouseUp(input)).toBe(true);
  });

  it("keeps the focus selection through the release of the click that focused it", () => {
    inLocale(<NumberField label="Quantity" defaultValue={12} />);
    const input = screen.getByRole("textbox", { name: "Quantity" }) as HTMLInputElement;
    fireEvent.mouseDown(input);
    act(() => input.focus());
    expect(fireEvent.mouseUp(input)).toBe(false);
  });

  it("an outside change wins over text the user typed but did not commit", () => {
    function Harness() {
      const [value, setValue] = React.useState(10);
      return (
        <>
          <NumberField label="Amount" value={value} onChange={setValue} />
          <button type="button" onClick={() => setValue(25)}>Reset</button>
        </>
      );
    }
    inLocale(<Harness />);
    const input = screen.getByRole("textbox", { name: "Amount" }) as HTMLInputElement;
    act(() => input.focus());
    fireEvent.change(input, { target: { value: "99" } });
    expect(input.value).toBe("99");
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(input.value).toBe("25");
  });

  it("a controlled value change shows while the field is focused", () => {
    function Harness() {
      const [value, setValue] = React.useState(10);
      return (
        <>
          <NumberField label="Price" value={value} onChange={setValue} />
          <button type="button" onClick={() => setValue(25)}>Reset</button>
        </>
      );
    }
    inLocale(<Harness />);
    const input = screen.getByRole("textbox", { name: "Price" }) as HTMLInputElement;
    act(() => input.focus());
    expect(input.value).toBe("10");
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(input.value).toBe("25");
  });

  it("formats money, percent and units in the field's locale", () => {
    inLocale(
      <>
        <NumberField label="Price" locale="nl-NL" defaultValue={248} currency="EUR" />
        <NumberField label="Share" locale="nl-NL" defaultValue={0.874} formatOptions={{ style: "percent", maximumFractionDigits: 1 }} />
        <NumberField label="Distance" locale="nl-NL" defaultValue={1250} suffix="km" />
      </>,
    );
    // "€ 248,00": the symbol is a leading addon, the amount keeps two decimals.
    const price = screen.getByRole("textbox", { name: /^Price ?\(EUR\)$/ }) as HTMLInputElement;
    expect(price.value).toBe("248,00");
    expect(screen.getByText("€").closest('[data-slot="input-addon"]')?.getAttribute("data-position")).toBe("start");
    expect((screen.getByRole("textbox", { name: "Share" }) as HTMLInputElement).value).toBe("87,4%");
    expect((screen.getByRole("textbox", { name: "Distance" }) as HTMLInputElement).value).toBe("1.250");
    expect(screen.getByText("km").closest('[data-slot="input-addon"]')).not.toBeNull();
  });

  it("puts the currency symbol where the locale does and uses the currency's decimals", () => {
    inLocale(
      <>
        <NumberField label="Total" locale="de-DE" defaultValue={248} currency="EUR" />
        <NumberField label="Yen" locale="nl-NL" defaultValue={1200} currency="JPY" formatOptions={{ style: "currency", currency: "JPY" }} />
      </>,
    );
    expect(screen.getByText("€").closest('[data-slot="input-addon"]')?.getAttribute("data-position")).toBe("end");
    expect((screen.getByRole("textbox", { name: /^Total ?\(EUR\)$/ }) as HTMLInputElement).value).toBe("248,00");
    // formatOptions' own currency style is overridden: the symbol shows once, as the addon.
    expect((screen.getByRole("textbox", { name: /^Yen ?\(JPY\)$/ }) as HTMLInputElement).value).toBe("1.200");
  });

  it("keeps an end addon off the frame edge when the stepper follows it", () => {
    inLocale(<NumberField label="Days" defaultValue={2} suffix="days" showStepper />);
    expect(screen.getByText("days").closest('[data-slot="input-addon"]')?.getAttribute("class")).not.toContain("-me-(--field-pad)");
  });

  it("steps with the keyboard and with named stepper buttons inside the bounds", () => {
    const onChange = vi.fn();
    inLocale(<NumberField label="Days" defaultValue={2} minValue={1} maxValue={3} showStepper onChange={onChange} />);
    const input = screen.getByRole("textbox", { name: "Days" });
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(onChange).toHaveBeenLastCalledWith(3);
    // React Aria names each step button by its action and the field ("Increase Days").
    fireEvent.click(screen.getByRole("button", { name: /^Increase/ }));
    expect(onChange).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: /^Decrease/ }));
    expect(onChange).toHaveBeenLastCalledWith(2);
  });

  it("is required like the other fields and wires its parts", () => {
    inLocale(<NumberField label="Deposit" isRequired description="Refunded when the order closes." />);
    const input = screen.getByRole("textbox", { name: "Deposit" });
    typeAndCommit(input as HTMLInputElement, "");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    const described = (input.getAttribute("aria-describedby") ?? "").split(" ").map((id) => document.getElementById(id)?.textContent ?? "");
    expect(described.join(" ")).toContain("Refunded when the order closes.");
    expect(described.join(" ")).toContain("Fill in this field.");
  });
});

describe("OtpField", () => {
  it("is one real input for SMS autofill and paste", () => {
    inLocale(<OtpField label="Verification code" />);
    const input = screen.getByRole("textbox", { name: "Verification code" });
    expect(input.getAttribute("autocomplete")).toBe("one-time-code");
    expect(input.getAttribute("inputmode")).toBe("numeric");
    // No maxlength: a browser would cut a pasted "482 917" to six characters before the digits are picked out.
    expect(input.hasAttribute("maxlength")).toBe(false);
    expect(document.querySelectorAll('[data-slot="otp-field-box"][aria-hidden="true"]')).toHaveLength(6);
    expect(document.querySelectorAll('[data-slot="otp-field-separator"]')).toHaveLength(1);
  });

  it("fills every box from a paste, keeps only digits and completes once", () => {
    const onComplete = vi.fn();
    inLocale(<OtpField label="Code" onComplete={onComplete} />);
    const input = screen.getByRole("textbox", { name: "Code" });
    fireEvent.change(input, { target: { value: "48 2-917" } });
    const boxes = Array.from(document.querySelectorAll('[data-slot="otp-field-box"]')).map((box) => box.textContent);
    expect(boxes).toEqual(["4", "8", "2", "9", "1", "7"]);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith("482917");
  });

  it("completes again when a new full code replaces an old one", () => {
    const onComplete = vi.fn();
    inLocale(<OtpField label="Code" onComplete={onComplete} />);
    const input = screen.getByRole("textbox", { name: "Code" });
    fireEvent.change(input, { target: { value: "111111" } });
    fireEvent.change(input, { target: { value: "222222" } });
    fireEvent.change(input, { target: { value: "222222" } });
    expect(onComplete.mock.calls.map((call) => call[0])).toEqual(["111111", "222222"]);
  });

  it("takes a full code pasted or autofilled after an old one (caret pinned to the end)", () => {
    const onComplete = vi.fn();
    inLocale(<OtpField label="Code" onComplete={onComplete} />);
    const input = screen.getByRole("textbox", { name: "Code" }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "111111" } });
    fireEvent.change(input, { target: { value: "111111222 222" } });
    expect(input.value).toBe("222222");
    expect(onComplete.mock.calls.map((call) => call[0])).toEqual(["111111", "222222"]);
    // One extra key on a full code is not a new code.
    fireEvent.change(input, { target: { value: "2222229" } });
    expect(input.value).toBe("222222");
  });

  it("finishes a partial code from a paste that only adds the rest", () => {
    inLocale(<OtpField label="Code" />);
    const input = screen.getByRole("textbox", { name: "Code" }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "48" } });
    fireEvent.change(input, { target: { value: "482917" } });
    expect(input.value).toBe("482917");
  });

  it("never pushes a narrow column sideways: the row fits its column and the cells may shrink", () => {
    render(<DesignSystemProvider locale="en" navigate={vi.fn()}><OtpField label="Code" /></DesignSystemProvider>);
    const row = document.querySelector('[data-slot="otp-field-box"]')?.parentElement;
    expect(row?.getAttribute("class")?.split(/\s+/)).toEqual(expect.arrayContaining(["w-full", "max-w-fit"]));
    for (const box of Array.from(document.querySelectorAll('[data-slot="otp-field-box"]'))) expect(box.getAttribute("class")).toContain("min-w-0");
    expect(document.querySelector('[data-slot="otp-field-separator"]')?.getAttribute("class")).toContain("shrink-0");
  });

  it("is required like the other fields", () => {
    inLocale(<OtpField label="Code" isRequired />);
    const input = screen.getByRole("textbox", { name: "Code" }) as HTMLInputElement;
    act(() => input.focus());
    act(() => input.blur());
    expect(input.getAttribute("aria-invalid")).toBe("true");
  });

  it("supports 4 digits without a separator", () => {
    inLocale(<OtpField label="PIN" length={4} />);
    expect(document.querySelectorAll('[data-slot="otp-field-box"]')).toHaveLength(4);
    expect(document.querySelector('[data-slot="otp-field-separator"]')).toBeNull();
  });

  it("keeps the digits and shows the error when invalid", () => {
    inLocale(<OtpField label="Code" isInvalid defaultValue="123456" errorMessage="Wrong code. Enter the latest code from your phone." />);
    const input = screen.getByRole("textbox", { name: "Code" }) as HTMLInputElement;
    expect(input.value).toBe("123456");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText("Wrong code. Enter the latest code from your phone.")).toBeTruthy();
  });

  it("does not show a new error while typing after a valid blur", () => {
    inLocale(<NumberField label="Deposit" isRequired defaultValue={100} />);
    const input = screen.getByRole("textbox", { name: "Deposit" }) as HTMLInputElement;
    act(() => input.focus());
    act(() => input.blur());
    act(() => input.focus());
    fireEvent.change(input, { target: { value: "" } });
    expect(input.getAttribute("aria-invalid")).toBeNull();
  });

  it("keeps the shown over-limit message current while the user keeps typing", () => {
    inLocale(<TextArea label="Note" maxLength={3} />);
    const area = screen.getByRole("textbox", { name: "Note" }) as HTMLTextAreaElement;
    act(() => area.focus());
    fireEvent.change(area, { target: { value: "abcde" } });
    act(() => area.blur());
    expect(screen.getByText("2 characters over the limit")).toBeTruthy();
    act(() => area.focus());
    fireEvent.change(area, { target: { value: "abcdefg" } });
    expect(screen.getByText("4 characters over the limit")).toBeTruthy();
  });
});
