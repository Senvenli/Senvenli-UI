import * as React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { PhoneField } from "./phone-field";

afterEach(cleanup);

function inLocale(ui: React.ReactElement, locale = "en") {
  return render(<DesignSystemProvider locale={locale} navigate={vi.fn()}>{ui}</DesignSystemProvider>);
}

const type = (input: HTMLElement, text: string) => fireEvent.change(input, { target: { value: text } });
const paste = (input: HTMLElement, text: string) => fireEvent.paste(input, { clipboardData: { getData: () => text } });

/** An empty one opens on Montenegro unless the test names another country, whatever the locale. */
function Controlled(props: Partial<React.ComponentProps<typeof PhoneField>> & { onValue?: (value: string, country: string) => void }) {
  const { onValue, ...rest } = props;
  const [value, setValue] = React.useState("");
  return (
    <PhoneField
      label="Phone"
      defaultCountry="ME"
      value={value}
      onChange={(next, country) => {
        setValue(next);
        onValue?.(next, country);
      }}
      {...rest}
    />
  );
}

const numberInput = () => screen.getByRole("textbox", { name: "Phone" }) as HTMLInputElement;

describe("PhoneField trunk prefix", () => {
  it("Montenegro: a number typed with its 0 is stored without it", () => {
    const onValue = vi.fn();
    inLocale(<Controlled onValue={onValue} />);
    type(numberInput(), "068 555 444");
    expect(onValue).toHaveBeenLastCalledWith("+38268555444", "ME");
    expect(numberInput().value).toBe("68 555 444");
  });

  it("typed digit by digit, the 0 stays until the digit that completes the number, then goes", () => {
    const onValue = vi.fn();
    inLocale(<Controlled onValue={onValue} />);
    let typed = "";
    for (const digit of "068555444") {
      typed = numberInput().value + digit;
      type(numberInput(), typed);
    }
    expect(onValue.mock.calls.map(([value]) => value)).toEqual([
      "+3820", "+38206", "+382068", "+3820685", "+38206855", "+382068555", "+3820685554", "+38206855544", "+38268555444",
    ]);
    expect(numberInput().value).toBe("68 555 444");
  });

  it("a national number pasted with its 0 loses it", () => {
    const onValue = vi.fn();
    inLocale(<Controlled onValue={onValue} />);
    // A national paste is not international: the browser inserts it and the field reads the change.
    expect(paste(numberInput(), "068 555 444")).toBe(true);
    type(numberInput(), "068 555 444");
    expect(onValue).toHaveBeenLastCalledWith("+38268555444", "ME");
  });

  it("an international paste still picks the country, also with a (0) left in it", () => {
    const onValue = vi.fn();
    inLocale(<Controlled onValue={onValue} />);
    paste(numberInput(), "+382 68 555 444");
    expect(onValue).toHaveBeenLastCalledWith("+38268555444", "ME");
    paste(numberInput(), "+381 (0)64 123 4567");
    expect(onValue).toHaveBeenLastCalledWith("+381641234567", "RS");
    expect(numberInput().value).toBe("64 123 4567");
  });

  it("Italy keeps its 0: 06 1234 5678", () => {
    const onValue = vi.fn();
    inLocale(<Controlled onValue={onValue} defaultCountry="IT" />);
    type(numberInput(), "06 1234 5678");
    expect(onValue).toHaveBeenLastCalledWith("+390612345678", "IT");
  });

  it("Kosovo: 044 123 456 is stored as +383 44 123 456", () => {
    const onValue = vi.fn();
    inLocale(<Controlled onValue={onValue} defaultCountry="XK" />);
    type(numberInput(), "044 123 456");
    expect(onValue).toHaveBeenLastCalledWith("+38344123456", "XK");
  });

  it("Russia: 8 912 345 67 89 is stored as +7 912 345 67 89; a whole 812 number is never cut", () => {
    const onValue = vi.fn();
    inLocale(<Controlled onValue={onValue} defaultCountry="RU" />);
    type(numberInput(), "8 912 345 67 89");
    expect(onValue).toHaveBeenLastCalledWith("+79123456789", "RU");
    type(numberInput(), "812 123 45 67");
    expect(onValue).toHaveBeenLastCalledWith("+78121234567", "RU");
  });

  it("the United States: 1 212 555 1234 is +1 212 555 1234", () => {
    const onValue = vi.fn();
    inLocale(<Controlled onValue={onValue} defaultCountry="US" />);
    type(numberInput(), "1 212 555 1234");
    expect(onValue).toHaveBeenLastCalledWith("+12125551234", "US");
  });

  it("choosing the country after typing the number reads the 0 as the new country's prefix", () => {
    const onValue = vi.fn();
    inLocale(<Controlled onValue={onValue} defaultCountry="IT" />);
    type(numberInput(), "068555444");
    expect(onValue).toHaveBeenLastCalledWith("+39068555444", "IT");
  });

  it.each([
    ["Arabic-Indic", "٠٦٨٥٥٥٤٤٤"],
    ["Extended Arabic-Indic", "۰۶۸۵۵۵۴۴۴"],
    ["full-width", "０６８５５５４４４"],
  ])("%s digits with the prefix strip the same way", (_, typed) => {
    const onValue = vi.fn();
    inLocale(<Controlled onValue={onValue} />);
    type(numberInput(), typed);
    expect(onValue).toHaveBeenLastCalledWith("+38268555444", "ME");
  });

  it("in an RTL locale the number reads the same and loses its prefix the same way", () => {
    const onValue = vi.fn();
    inLocale(<Controlled onValue={onValue} />, "ar-EG");
    type(numberInput(), "٠٦٨ ٥٥٥ ٤٤٤");
    expect(onValue).toHaveBeenLastCalledWith("+38268555444", "ME");
    expect(numberInput().value).toBe("68 555 444");
  });

  it("the caret stays after the same digit when the prefix goes", () => {
    inLocale(<Controlled />);
    const input = numberInput();
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    act(() => {
      input.focus();
      setValue.call(input, "068555444");
      input.setSelectionRange(9, 9);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(input.value).toBe("68 555 444");
    expect(input.selectionStart).toBe(input.value.length);
  });
});
