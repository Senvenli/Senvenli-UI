import * as React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { PhoneField } from "./index";
import { PHONE_COUNTRIES } from "./phone";
import { stripTrunkPrefix } from "./phone-paste";

afterEach(cleanup);

function inLocale(ui: React.ReactElement, locale = "en") {
  return render(<DesignSystemProvider locale={locale} navigate={vi.fn()}>{ui}</DesignSystemProvider>);
}

const type = (input: HTMLElement, text: string) => fireEvent.change(input, { target: { value: text } });

function Controlled({ onValue }: { onValue: (value: string, country: string) => void }) {
  const [value, setValue] = React.useState("");
  return (
    <PhoneField
      label="Phone"
      defaultCountry="XK"
      value={value}
      onChange={(next, country) => {
        setValue(next);
        onValue(next, country);
      }}
    />
  );
}

const numberInput = () => screen.getByRole("textbox", { name: "Phone" }) as HTMLInputElement;
const kosovo = PHONE_COUNTRIES.find((item) => item.iso === "XK");

/**
 * Kosovo's trunk prefix 0 is stripped (the source note is in ./phone.ts), and a 9-digit fixed number (NDCs 280,
 * 290, 390; ARKEP's ITU-T communication of 15.III.2017) is kept whole.
 */
describe("PhoneField: Kosovo", () => {
  it("stores 044 123 456 as +383 44 123 456", () => {
    const onValue = vi.fn();
    inLocale(<Controlled onValue={onValue} />);
    type(numberInput(), "044 123 456");
    expect(onValue).toHaveBeenLastCalledWith("+38344123456", "XK");
  });

  it("keeps a 9-digit fixed number whole, with or without its 0", () => {
    const onValue = vi.fn();
    inLocale(<Controlled onValue={onValue} />);
    type(numberInput(), "0280 123 456");
    expect(onValue).toHaveBeenLastCalledWith("+383280123456", "XK");
    type(numberInput(), "280 123 456");
    expect(onValue).toHaveBeenLastCalledWith("+383280123456", "XK");
  });

  it("strips the 0 before a Kosovo number", () => {
    expect(stripTrunkPrefix("044123456", kosovo)).toBe("44123456");
  });
});
