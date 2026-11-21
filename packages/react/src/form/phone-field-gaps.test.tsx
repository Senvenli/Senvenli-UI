import * as React from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { Field, PhoneField } from "./index";

beforeAll(() => {
  // jsdom has no CSS.escape; React Aria's Autocomplete uses it to find the focused option.
  globalThis.CSS ??= {} as typeof CSS;
  CSS.escape ??= (value: string) => value.replace(/[^\w-]/g, (char) => `\\${char}`);
});
afterEach(cleanup);

function inLocale(ui: React.ReactElement, locale = "en") {
  return render(<DesignSystemProvider locale={locale} navigate={vi.fn()}>{ui}</DesignSystemProvider>);
}

/** The country list renders every country (~240 options); jsdom is slow at that under a loaded full run. */
const LIST_TIMEOUT = 20_000;

const type = (input: HTMLElement, text: string) => fireEvent.change(input, { target: { value: text } });

/** A country's English name as this runtime's Intl data writes it ("Türkiye" or "Turkey", by ICU version). */
const englishName = (iso: string) => new Intl.DisplayNames(["en"], { type: "region" }).of(iso)!;

/** Types the way a browser does: the new text, with the caret where it ends up, as one input event. */
function typeAt(input: HTMLInputElement, text: string, caret: number) {
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  act(() => {
    input.focus();
    setValue.call(input, text);
    input.setSelectionRange(caret, caret);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

/** An empty one opens on Montenegro, the country these numbers are written for, whatever the locale. */
function Controlled(props: Partial<React.ComponentProps<typeof PhoneField>> & { start?: string; onValue?: (value: string, country: string) => void }) {
  const { start = "", onValue, ...rest } = props;
  const [value, setValue] = React.useState(start);
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

const describedTexts = (input: HTMLElement) =>
  (input.getAttribute("aria-describedby") ?? "").split(" ").filter(Boolean).map((id) => document.getElementById(id)?.textContent ?? `#${id}?`);

describe("PhoneField id and aria-describedby", () => {
  it("the id goes on the number input, so an app label and a focus-on-error reach it", () => {
    inLocale(
      <>
        <label htmlFor="editCustomerPhone">Customer phone</label>
        <PhoneField id="editCustomerPhone" label="Phone" />
      </>,
    );
    const input = document.getElementById("editCustomerPhone") as HTMLInputElement;
    expect(input.getAttribute("data-slot")).toBe("phone-field-input");
    expect(input.labels?.[0]?.textContent).toBe("Customer phone");
    act(() => input.focus());
    expect(document.activeElement).toBe(input);
  });

  it("aria-describedby adds the app's hint to the field's own description and error", () => {
    inLocale(
      <>
        <PhoneField label="Phone" aria-describedby="app-hint" description="By WhatsApp" errorMessage="Not registered" />
        <p id="app-hint">With the country code</p>
      </>,
    );
    const input = screen.getByRole("textbox", { name: "Phone" });
    expect(describedTexts(input)).toEqual(expect.arrayContaining(["With the country code", "By WhatsApp", "Not registered"]));
  });

  it("inside the DS Field: the generated id, the hint and the error reach the number input, and its error marks it", () => {
    const { rerender } = inLocale(
      <Field label="Phone (form)" hint="In international format">
        <PhoneField label="Phone" />
      </Field>,
    );
    // The row's label points at the control by the id it hands down (its `for`).
    const rowControl = () => document.getElementById(document.querySelector("label[data-slot='label']")!.getAttribute("for")!) as HTMLInputElement;
    const input = rowControl();
    expect(input.getAttribute("data-slot")).toBe("phone-field-input");
    expect(describedTexts(input)).toContain("In international format");
    expect(input.getAttribute("aria-invalid")).toBeNull();
    rerender(
      <DesignSystemProvider locale="en" navigate={vi.fn()}>
        <Field label="Phone (form)" error="A phone number is required">
          <PhoneField label="Phone" />
        </Field>
      </DesignSystemProvider>,
    );
    const invalid = rowControl();
    expect(describedTexts(invalid)).toContain("A phone number is required");
    expect(invalid.getAttribute("aria-invalid")).toBe("true");
    // The row's error is the one shown: the field draws no second row, and the input stays natively valid.
    expect(document.querySelector("[data-slot='field-error']")).toBeNull();
    expect(invalid.validity.valid).toBe(true);
    expect(document.querySelector("[data-slot='phone-field']")!.hasAttribute("data-invalid")).toBe(true);
  });

  it("RTL: the id and the description reach the input", () => {
    inLocale(<PhoneField id="p" label="هاتف" aria-describedby="h" />, "ar-AE");
    const input = document.getElementById("p")!;
    expect(input.getAttribute("dir")).toBe("ltr");
    expect(input.getAttribute("aria-describedby")).toContain("h");
  });
});

describe("PhoneField stops at the country's length while typing", () => {
  it("typing past the length drops the extra digits; no error comes on blur", () => {
    const onValue = vi.fn();
    inLocale(<Controlled onValue={onValue} />);
    const input = screen.getByRole("textbox", { name: "Phone" }) as HTMLInputElement;
    type(input, "68555444454525626512646523216");
    expect(onValue).toHaveBeenLastCalledWith("+38268555444", "ME");
    expect(input.value).toBe("68 555 444");
    fireEvent.blur(input);
    expect(document.querySelector("[data-slot='field-error']")).toBeNull();
    expect(input.getAttribute("aria-invalid")).toBeNull();
  });

  it("each country's own length: Türkiye 10, Serbia up to 9", () => {
    const onValue = vi.fn();
    inLocale(<Controlled onValue={onValue} country="TR" />);
    type(screen.getByRole("textbox", { name: "Phone" }), "532 123 45 67 89");
    expect(onValue).toHaveBeenLastCalledWith("+905321234567", "TR");
    cleanup();
    inLocale(<Controlled onValue={onValue} country="RS" />);
    type(screen.getByRole("textbox", { name: "Phone" }), "64 123 45678");
    expect(onValue).toHaveBeenLastCalledWith("+381641234567", "RS");
  });

  it("one more digit at the end of a full number changes nothing; the caret stays at the end", () => {
    const onValue = vi.fn();
    inLocale(<Controlled start="+38268555444" onValue={onValue} />);
    const input = screen.getByRole("textbox", { name: "Phone" }) as HTMLInputElement;
    typeAt(input, "68 555 4449", 11);
    expect(onValue).toHaveBeenLastCalledWith("+38268555444", "ME");
    expect(input.value).toBe("68 555 444");
    expect(input.selectionStart).toBe(10);
  });

  it("a digit typed inside a full number stays where it was typed, with the caret after it; the last digit goes", () => {
    const onValue = vi.fn();
    inLocale(<Controlled start="+38268555444" onValue={onValue} />);
    const input = screen.getByRole("textbox", { name: "Phone" }) as HTMLInputElement;
    typeAt(input, "68 1555 444", 4);
    expect(onValue).toHaveBeenLastCalledWith("+38268155544", "ME");
    expect(input.value).toBe("68 155 544");
    expect(input.selectionStart).toBe(4);
  });

  it("a pasted number, national or international, stops at the length", () => {
    const onValue = vi.fn();
    inLocale(<Controlled onValue={onValue} />);
    const input = screen.getByRole("textbox", { name: "Phone" });
    fireEvent.paste(input, { clipboardData: { getData: () => "+90 532 123 45 67 89" } });
    expect(onValue).toHaveBeenLastCalledWith("+905321234567", "TR");
    // A national paste is not intercepted: it arrives as typing, and is cut the same way.
    type(input, "532 123 45 67 1234");
    expect(onValue).toHaveBeenLastCalledWith("+905321234567", "TR");
  });

  it("switching to a country with shorter numbers cuts the number to its length", async () => {
    const onValue = vi.fn();
    inLocale(<Controlled start="+905321234567" onValue={onValue} />);
    fireEvent.click(screen.getByRole("button", { name: `Country: ${englishName("TR")}, +90` }));
    const search = await screen.findByRole("searchbox", { name: "Search countries" });
    type(search, "montenegro");
    fireEvent.click(within(screen.getByRole("listbox")).getByRole("option", { name: /Montenegro/ }));
    expect(onValue).toHaveBeenLastCalledWith("+38253212345", "ME");
  }, LIST_TIMEOUT);

  it("a stored over-long number is kept as it is until edited, and only it can still be called too long", () => {
    const onValue = vi.fn();
    inLocale(<Controlled start="+382685554449" onValue={onValue} />);
    const input = screen.getByRole("textbox", { name: "Phone" }) as HTMLInputElement;
    expect(input.value.replace(/\s/g, "")).toBe("685554449");
    expect(onValue).not.toHaveBeenCalled();
    fireEvent.blur(input);
    expect(document.querySelector("[data-slot='field-error']")!.textContent).toBe("The number looks too long. Montenegro numbers have 8 digits.");
    // The first edit cuts it, and the error clears with it.
    type(input, "68 555 4449 1");
    expect(onValue).toHaveBeenLastCalledWith("+38268555444", "ME");
    expect(document.querySelector("[data-slot='field-error']")).toBeNull();
  });

  it("an input method's composition is left as typed until it ends, then taken as one edit", () => {
    const onValue = vi.fn();
    inLocale(<Controlled onValue={onValue} />);
    const input = screen.getByRole("textbox", { name: "Phone" }) as HTMLInputElement;
    fireEvent.compositionStart(input);
    type(input, "6855544445");
    expect(onValue).not.toHaveBeenCalled();
    expect(input.value).toBe("6855544445");
    fireEvent.compositionEnd(input);
    expect(onValue).toHaveBeenLastCalledWith("+38268555444", "ME");
    expect(input.value).toBe("68 555 444");
  });
});

describe("PhoneField country-picker strings from the app", () => {
  it("the app's words name the country button, the list and the search, and say the empty result", async () => {
    inLocale(
      <Controlled
        start="+38267123456"
        countryLabel={(country, code) => `Dial code: ${country}: ${code}`}
        countryListLabel="Dial codes"
        countrySearchLabel="Search a country or a code"
        countryEmptyMessage={(query) => `No country for “${query}”`}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Dial code: Montenegro: +382" }));
    expect(await screen.findByRole("dialog", { name: "Dial codes" })).toBeTruthy();
    expect(screen.getByRole("listbox", { name: "Dial codes" })).toBeTruthy();
    const search = screen.getByRole("searchbox", { name: "Search a country or a code" });
    type(search, "zzzz");
    expect(document.querySelector("[data-slot='phone-field-empty']")!.textContent).toBe("No country for “zzzz”");
  }, LIST_TIMEOUT);

  it("left out, the empty result is the DS sentence with the typed search in it", async () => {
    inLocale(<Controlled start="+38267123456" />);
    fireEvent.click(screen.getByRole("button", { name: "Country: Montenegro, +382" }));
    expect(await screen.findByRole("dialog", { name: "Country" })).toBeTruthy();
    type(screen.getByRole("searchbox", { name: "Search countries" }), "zzzz");
    expect(document.querySelector("[data-slot='phone-field-empty']")!.textContent).toBe("No results for “zzzz”.");
  }, LIST_TIMEOUT);

  it("a locked field's country mark takes the app's name too", () => {
    inLocale(<PhoneField label="Phone" defaultValue="+38267123456" isDisabled countryLabel={(country, code) => `${country} ${code}`} />);
    expect(screen.getByRole("img", { name: "Montenegro +382" })).toBeTruthy();
  });
});

describe("PhoneField takes digits from any script", () => {
  const SCRIPTS: Array<[string, string]> = [
    ["full-width (a Japanese IME)", "６８５５５４４４"],
    ["Arabic-Indic", "٦٨٥٥٥٤٤٤"],
    ["Extended Arabic-Indic (Persian, Urdu)", "۶۸۵۵۵۴۴۴"],
    ["Devanagari", "६८५५५४४४"],
  ];

  for (const [script, digits] of SCRIPTS) {
    it(`${script} digits are typed as the same digits`, () => {
      const onValue = vi.fn();
      inLocale(<Controlled onValue={onValue} />);
      const input = screen.getByRole("textbox", { name: "Phone" }) as HTMLInputElement;
      type(input, digits);
      expect(onValue).toHaveBeenLastCalledWith("+38268555444", "ME");
      expect(input.value).toBe("68 555 444");
    });
  }

  it("a full-width number from a Japanese IME composition is taken when the composition ends, cut at the length", () => {
    const onValue = vi.fn();
    inLocale(<Controlled onValue={onValue} country="TR" />);
    const input = screen.getByRole("textbox", { name: "Phone" }) as HTMLInputElement;
    fireEvent.compositionStart(input);
    type(input, "５３２１２３４５６７８");
    expect(onValue).not.toHaveBeenCalled();
    fireEvent.compositionEnd(input);
    expect(onValue).toHaveBeenLastCalledWith("+905321234567", "TR");
    expect(input.value).toBe("532 123 45 67");
  });

  it("a digit typed in another script inside a number lands where it was typed, with the caret after it", () => {
    const onValue = vi.fn();
    inLocale(<Controlled start="+3826855544" onValue={onValue} />);
    const input = screen.getByRole("textbox", { name: "Phone" }) as HTMLInputElement;
    typeAt(input, "68 ٧555 44", 4);
    expect(onValue).toHaveBeenLastCalledWith("+38268755544", "ME");
    expect(input.value).toBe("68 755 544");
    expect(input.selectionStart).toBe(4);
  });

  it("an international paste in full-width or Arabic-Indic digits picks the country", () => {
    const onValue = vi.fn();
    inLocale(<Controlled onValue={onValue} />);
    const input = screen.getByRole("textbox", { name: "Phone" });
    fireEvent.paste(input, { clipboardData: { getData: () => "＋９０ ５３２ １２３ ４５ ６７" } });
    expect(onValue).toHaveBeenLastCalledWith("+905321234567", "TR");
    fireEvent.paste(input, { clipboardData: { getData: () => "٠٠٣٨٢ ٦٨ ٥٥٥ ٤٤٤" } });
    expect(onValue).toHaveBeenLastCalledWith("+38268555444", "ME");
    fireEvent.paste(input, { clipboardData: { getData: () => "００３８１ ６４ １２３ ４５６７" } });
    expect(onValue).toHaveBeenLastCalledWith("+381641234567", "RS");
  });

  it("RTL (ar-AE): Arabic-Indic digits are stored as ASCII E.164", () => {
    const onValue = vi.fn();
    inLocale(<Controlled onValue={onValue} />, "ar-AE");
    const input = screen.getByRole("textbox") as HTMLInputElement;
    type(input, "٦٨٥٥٥٤٤٤");
    expect(onValue).toHaveBeenLastCalledWith("+38268555444", "ME");
  });
});
