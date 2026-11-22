import * as React from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { registerDsStrings } from "../i18n";
import { Field } from "./index";
import { PhoneField } from "./phone-field";

beforeAll(() => {
  // jsdom has no CSS.escape; React Aria's Autocomplete uses it to find the focused option.
  globalThis.CSS ??= {} as typeof CSS;
  CSS.escape ??= (value: string) => value.replace(/[^\w-]/g, (char) => `\\${char}`);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function inLocale(ui: React.ReactElement, locale = "en") {
  return render(<DesignSystemProvider locale={locale} navigate={vi.fn()}>{ui}</DesignSystemProvider>);
}

/** The country list renders every country (~240 options); jsdom is slow at that under a loaded full run. */
const LIST_TIMEOUT = 20_000;

/** The accessible name from aria-labelledby (else aria-label), as accname reads it. */
function nameOf(element: Element) {
  const ids = (element.getAttribute("aria-labelledby") ?? "").split(/\s+/).filter(Boolean);
  if (!ids.length) return element.getAttribute("aria-label") ?? "";
  return ids.map((id) => document.getElementById(id)?.textContent ?? "").join(" ").replace(/\s+/g, " ").trim();
}
const describedTexts = (input: HTMLElement) =>
  (input.getAttribute("aria-describedby") ?? "").split(" ").filter(Boolean).map((id) => document.getElementById(id)?.textContent ?? `#${id}?`);
const numberInput = () => document.querySelector<HTMLInputElement>("[data-slot='phone-field-input']")!;
const countryButton = () => document.querySelector<HTMLElement>("[data-slot='phone-field-country']")!;

describe("PhoneField: the country list's section names from the app", () => {
  it(
    "suggestedCountriesLabel names the first section and allCountriesLabel heads the rest",
    async () => {
      inLocale(<PhoneField label="Phone" suggestedCountries={["ME", "TR"]} suggestedCountriesLabel="Frequently used" allCountriesLabel="Other countries" />);
      fireEvent.click(screen.getByRole("button", { name: /Country/ }));
      const listbox = await screen.findByRole("listbox");
      const suggested = listbox.querySelector("[data-slot='phone-field-suggested']")!;
      expect(suggested.getAttribute("aria-label")).toBe("Frequently used");
      expect(within(suggested as HTMLElement).getAllByRole("option")).toHaveLength(2);
      const all = listbox.querySelector("[data-slot='phone-field-all']")!;
      expect(all.querySelector("header")?.textContent).toBe("Other countries");
      // The header names its section for assistive tech, as React Aria wires it.
      expect(nameOf(all)).toBe("Other countries");
    },
    LIST_TIMEOUT,
  );

  it(
    "the section header is written in sentence case: small and medium, never uppercased",
    async () => {
      inLocale(<PhoneField label="Phone" suggestedCountries={["ME"]} />);
      fireEvent.click(countryButton());
      const header = (await screen.findByRole("listbox")).querySelector("[data-slot='phone-field-all'] header")!;
      expect(header.textContent).toBe("All countries");
      const classes = header.className.split(/\s+/);
      expect(classes).toEqual(expect.arrayContaining(["text-body-small", "font-medium"]));
      expect(classes).not.toContain("uppercase");
    },
    LIST_TIMEOUT,
  );

  it(
    "left out, the words are the ones the app registered for the locale",
    async () => {
      registerDsStrings("de", { phoneSuggestedCountries: "Vorgeschlagene Länder", phoneAllCountries: "Alle Länder", phoneCountryList: "Land", phoneCountrySearch: "Länder suchen" });
      inLocale(<PhoneField label="Telefon" suggestedCountries={["ME"]} />, "de");
      fireEvent.click(countryButton());
      const listbox = await screen.findByRole("listbox", { name: "Land" });
      expect(listbox.querySelector("[data-slot='phone-field-suggested']")!.getAttribute("aria-label")).toBe("Vorgeschlagene Länder");
      expect(listbox.querySelector("[data-slot='phone-field-all'] header")!.textContent).toBe("Alle Länder");
      expect(screen.getByRole("searchbox", { name: "Länder suchen" })).toBeTruthy();
      // A string the app left out stays English: the country button's name, around the German country name.
      expect(countryButton().getAttribute("aria-label")).toBe("Country: Deutschland, +49");
    },
    LIST_TIMEOUT,
  );

  it(
    "a locale with no registered strings falls back to English (fr, and ar in RTL)",
    async () => {
      for (const locale of ["fr", "ar-AE"]) {
        inLocale(<PhoneField label="Phone" suggestedCountries={["ME"]} />, locale);
        fireEvent.click(countryButton());
        const listbox = await screen.findByRole("listbox", { name: "Country" });
        expect(listbox.querySelector("[data-slot='phone-field-suggested']")!.getAttribute("aria-label")).toBe("Suggested countries");
        expect(listbox.querySelector("[data-slot='phone-field-all'] header")!.textContent).toBe("All countries");
        expect(screen.getByRole("searchbox", { name: "Search countries" })).toBeTruthy();
        cleanup();
      }
    },
    LIST_TIMEOUT,
  );

  it(
    "searching hides the header with the suggested section, and the keyboard still walks the options",
    async () => {
      inLocale(<PhoneField label="Phone" suggestedCountries={["ME"]} suggestedCountriesLabel="Frequently used" allCountriesLabel="Other countries" />);
      fireEvent.click(screen.getByRole("button", { name: /Country/ }));
      const search = await screen.findByRole("searchbox");
      fireEvent.change(search, { target: { value: "germany" } });
      const listbox = screen.getByRole("listbox");
      expect(listbox.querySelector("[data-slot='phone-field-suggested']")).toBeNull();
      expect(listbox.querySelector("header")).toBeNull();
      fireEvent.keyDown(search, { key: "ArrowDown" });
      fireEvent.keyDown(search, { key: "Enter" });
      expect(screen.getByRole("button", { name: /Germany/ })).not.toBeNull();
    },
    LIST_TIMEOUT,
  );
});

describe("PhoneField named from outside, label left out", () => {
  it("inside the DS Field: one label, the Field's, names the number; hint and error still describe it", () => {
    const { container } = inLocale(
      <Field label="Customer phone" errorMessage="A phone number is required.">
        <PhoneField />
      </Field>,
    );
    expect(container.querySelectorAll("label")).toHaveLength(1);
    expect(container.querySelector("[data-slot='field-label']")).toBeNull();
    const input = numberInput();
    const label = container.querySelector("label")!;
    expect(label.htmlFor).toBe(input.id);
    expect(input.getAttribute("aria-labelledby")).toBe(`${input.id}-label`);
    expect(label.id).toBe(`${input.id}-label`);
    expect(nameOf(input)).toBe("Customer phone");
    expect(screen.getByRole("textbox", { name: "Customer phone" })).toBe(input);
    expect(describedTexts(input)).toContain("A phone number is required.");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    // The country button keeps its own name (the locale's country, with no defaultCountry given).
    expect(screen.getByRole("button", { name: "Country: United States, +1" })).not.toBeNull();
  });

  it("inside the Field without a label, typing and grouping work as before", () => {
    const onChange = vi.fn();
    inLocale(
      <Field label="Phone">
        <PhoneField defaultCountry="ME" onChange={onChange} />
      </Field>,
    );
    const input = numberInput();
    fireEvent.change(input, { target: { value: "68555444" } });
    expect(onChange).toHaveBeenLastCalledWith("+38268555444", "ME");
    expect(input.value).toBe("68 555 444");
  });

  it("an app's own <label htmlFor> names it by its id; a label without an id is read as text", () => {
    inLocale(
      <>
        <label id="app-phone-label" htmlFor="app-phone">Emergency phone</label>
        <PhoneField id="app-phone" />
      </>,
    );
    expect(numberInput().getAttribute("aria-labelledby")).toBe("app-phone-label");
    expect(nameOf(numberInput())).toBe("Emergency phone");
    cleanup();
    inLocale(
      <>
        <label htmlFor="app-phone">Emergency <span aria-hidden="true">*</span>phone</label>
        <PhoneField id="app-phone" />
      </>,
    );
    expect(numberInput().getAttribute("aria-label")).toBe("Emergency phone");
  });

  it("aria-label and aria-labelledby name it with no label of its own", () => {
    const { container } = inLocale(<PhoneField aria-label="Phone" />);
    expect(container.querySelector("[data-slot='field-label']")).toBeNull();
    expect(numberInput().getAttribute("aria-label")).toBe("Phone");
    cleanup();
    const second = inLocale(
      <>
        <h3 id="phone-heading">Contact</h3>
        <PhoneField aria-labelledby="phone-heading" />
      </>,
    );
    expect(second.container.querySelector("[data-slot='field-label']")).toBeNull();
    expect(nameOf(numberInput())).toBe("Contact");
  });

  it("warns in development only when nothing names it", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    inLocale(
      <Field label="Phone">
        <PhoneField />
      </Field>,
    );
    inLocale(<PhoneField label="Phone" />);
    inLocale(<PhoneField aria-label="Phone" />);
    expect(warn.mock.calls.filter((call) => String(call[0]).startsWith("PhoneField:"))).toEqual([]);
    inLocale(<PhoneField />);
    expect(warn.mock.calls.filter((call) => String(call[0]).startsWith("PhoneField: no accessible name"))).toHaveLength(1);
  });

  it("RTL (ar-AE): one label, the Field's, and the same name", () => {
    const { container } = inLocale(
      <div dir="rtl">
        <Field label="الهاتف">
          <PhoneField />
        </Field>
      </div>,
      "ar-AE",
    );
    expect(container.querySelectorAll("label")).toHaveLength(1);
    expect(nameOf(numberInput())).toBe("الهاتف");
  });

  it("server render and hydration agree, and the name is the Field's before and after", async () => {
    const ui = (
      <DesignSystemProvider locale="en" navigate={vi.fn()}>
        <Field label="Phone" htmlFor="ssr-phone" description="With the country code.">
          <PhoneField id="ssr-phone" />
        </Field>
      </DesignSystemProvider>
    );
    const host = document.createElement("div");
    host.innerHTML = renderToString(ui);
    document.body.append(host);
    // Before any script: the native label binding and aria-labelledby both point at the Field's label.
    expect(host.querySelectorAll("label")).toHaveLength(1);
    expect(host.querySelector("#ssr-phone")!.getAttribute("aria-labelledby")).toBe("ssr-phone-label");
    expect(nameOf(host.querySelector("#ssr-phone")!)).toBe("Phone");
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    let root: ReturnType<typeof hydrateRoot> | undefined;
    await act(async () => {
      root = hydrateRoot(host, ui);
    });
    expect(errors.mock.calls.filter((call) => /hydrat|did not match/i.test(String(call[0])))).toEqual([]);
    expect(nameOf(document.getElementById("ssr-phone")!)).toBe("Phone");
    expect(describedTexts(document.getElementById("ssr-phone")!)).toContain("With the country code.");
    act(() => root?.unmount());
    host.remove();
  });
});

describe("PhoneField paste: digits are digitsOf's", () => {
  function Controlled({ onValue }: { onValue: (value: string, country: string) => void }) {
    const [value, setValue] = React.useState("");
    return <PhoneField label="Phone" defaultCountry="ME" value={value} onChange={(next, country) => { setValue(next); onValue(next, country); }} />;
  }

  it("superscripts, circled numbers and fractions in an international paste are not digits", () => {
    const onValue = vi.fn();
    inLocale(<Controlled onValue={onValue} />);
    fireEvent.paste(numberInput(), { clipboardData: { getData: () => "+382 ²68 ①555 ½444" } });
    expect(onValue).toHaveBeenLastCalledWith("+38268555444", "ME");
    fireEvent.paste(numberInput(), { clipboardData: { getData: () => "＋382 68 555 444" } });
    expect(onValue).toHaveBeenLastCalledWith("+38268555444", "ME");
  });

  it("\"⁰⁰\" is not an international prefix: the paste is left to the browser", () => {
    const onValue = vi.fn();
    inLocale(<Controlled onValue={onValue} />);
    expect(fireEvent.paste(numberInput(), { clipboardData: { getData: () => "⁰⁰382 68 555 444" } })).toBe(true);
    expect(onValue).not.toHaveBeenCalled();
  });
});
