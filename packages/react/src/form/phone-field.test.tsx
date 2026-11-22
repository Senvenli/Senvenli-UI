import * as React from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { Button } from "../action";
import { registerDsStrings } from "../i18n";
import { registerLocaleAliases } from "../intl-locale";
import { Dialog, DialogTrigger } from "../overlay";
import { Form } from "./index";
import { PhoneField } from "./phone-field";

beforeAll(() => {
  // jsdom has no CSS.escape; React Aria's Autocomplete uses it to find the focused option.
  globalThis.CSS ??= {} as typeof CSS;
  CSS.escape ??= (value: string) => value.replace(/[^\w-]/g, (char) => `\\${char}`);
});
afterEach(cleanup);

function inLocale(ui: React.ReactElement, locale = "en") {
  return render(
    <DesignSystemProvider locale={locale} navigate={vi.fn()}>
      {ui}
    </DesignSystemProvider>,
  );
}

/** The country list renders every country (~240 options); jsdom is slow at that under a loaded full run. */
const LIST_TIMEOUT = 30_000;
// Opening a 250-country list under a loaded full run can take longer than findBy's default second.
const FIND = { timeout: 5_000 };

const type = (input: HTMLElement, text: string) => fireEvent.change(input, { target: { value: text } });

/** A country's English name as this runtime's Intl data writes it ("Türkiye" or "Turkey", by ICU version). */
const englishName = (iso: string) => new Intl.DisplayNames(["en"], { type: "region" }).of(iso)!;

/**
 * A controlled PhoneField that records every change. An empty one opens on Montenegro, the country these numbers
 * are written for; a test about the locale's own default passes none of this.
 */
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

describe("PhoneField", () => {
  it("gives the form one E.164 value and the country; spaces group as typed and never reach the value", () => {
    const onValue = vi.fn();
    inLocale(<Controlled onValue={onValue} />);
    const input = screen.getByRole("textbox", { name: "Phone" });
    expect(input.getAttribute("type")).toBe("tel");
    expect(input.getAttribute("inputmode")).toBe("tel");
    expect(input.getAttribute("autocomplete")).toBe("tel-national");
    type(input, "67 123456");
    expect(onValue).toHaveBeenLastCalledWith("+38267123456", "ME");
    expect((input as HTMLInputElement).value).toBe("67 123 456");
    type(input, "");
    expect(onValue).toHaveBeenLastCalledWith("", "ME");
  });

  it("reads the country from a stored number; the country button names it", () => {
    inLocale(<Controlled start="+905321234567" />);
    expect((screen.getByRole("textbox", { name: "Phone" }) as HTMLInputElement).value).toBe("532 123 45 67");
    expect(screen.getByRole("button", { name: `Country: ${englishName("TR")}, +90` })).toBeTruthy();
  });

  it("label, description and error belong to the number input", () => {
    inLocale(<PhoneField label="Phone" isRequired description="The confirmation goes by WhatsApp." errorMessage="This number is not registered." isInvalid defaultValue="" />);
    const input = screen.getByRole("textbox", { name: "Phone" });
    expect(input.getAttribute("aria-required")).toBe("true");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    const describedBy = input.getAttribute("aria-describedby")!.split(" ").map((id) => document.getElementById(id)!.textContent);
    expect(describedBy).toEqual(expect.arrayContaining(["The confirmation goes by WhatsApp.", "This number is not registered."]));
  });

  it("checks the length on blur, not per keystroke, and says what to do; fixing it clears the error", () => {
    inLocale(<Controlled start="+90" defaultCountry="TR" country="TR" />);
    const input = screen.getByRole("textbox", { name: "Phone" });
    type(input, "53212");
    expect(document.querySelector("[data-slot='field-error']")).toBeNull();
    fireEvent.blur(input);
    expect(document.querySelector("[data-slot='field-error']")!.textContent).toBe(`The number looks incomplete. ${englishName("TR")} numbers have 10 digits.`);
    expect(input.getAttribute("aria-invalid")).toBe("true");
    type(input, "5321234567");
    expect(document.querySelector("[data-slot='field-error']")).toBeNull();
  });

  it("pasting an international number switches the country", () => {
    const onValue = vi.fn();
    inLocale(<Controlled onValue={onValue} />);
    const input = screen.getByRole("textbox", { name: "Phone" });
    fireEvent.paste(input, { clipboardData: { getData: () => "+381 64 123 4567" } });
    expect(onValue).toHaveBeenLastCalledWith("+381641234567", "RS");
    expect(screen.getByRole("button", { name: "Country: Serbia, +381" })).toBeTruthy();
  });

  // In German, so a country's own name and its English name differ: the search finds both. The field's own words
  // stay English, as for every locale an app registered no strings for.
  it("the country list is as wide as the field, searches name, English name, ISO and calling code, suggested first", async () => {
    const onValue = vi.fn();
    inLocale(<Controlled onValue={onValue} start="+38267123456" suggestedCountries={["ME", "AT", "HR"]} />, "de");
    fireEvent.click(screen.getByRole("button", { name: "Country: Montenegro, +382" }));
    const listbox = await screen.findByRole("listbox", { name: "Country" }, FIND);
    expect(document.querySelector("[data-slot='phone-field-popover']")!.className).toContain("w-(--trigger-width)");
    const sections = listbox.querySelectorAll("[data-slot='phone-field-suggested'] [role='option']");
    expect([...sections].map((option) => option.textContent)).toEqual(["MEMontenegro+382", "ATÖsterreich+43", "HRKroatien+385"]);
    expect(within(listbox).getByText("All countries")).toBeTruthy();
    expect(within(listbox).getByRole("option", { name: /Montenegro/ }).getAttribute("aria-selected")).toBe("true");
    const search = screen.getByRole("searchbox", { name: "Search countries" });
    const names = () => within(screen.getByRole("listbox")).queryAllByRole("option").map((option) => option.querySelector("[slot='label']")?.textContent ?? option.textContent);
    // Suggested first: Österreich leads, though Frankreich sorts before it.
    type(search, "reich");
    expect(names()).toEqual(["Österreich", "Frankreich", "Vereinigtes Königreich"]);
    // Diacritics folded: "oster" finds Österreich.
    type(search, "oster");
    expect(names()).toEqual(["Österreich"]);
    expect(screen.getByRole("listbox").querySelector("mark")!.textContent).toBe("Öster");
    type(search, "382");
    expect(names()).toEqual(["Montenegro"]);
    type(search, "croatia");
    expect(names()).toEqual(["Kroatien"]);
    type(search, "hr");
    expect(names()).toContain("Kroatien");
    fireEvent.click(within(screen.getByRole("listbox")).getByRole("option", { name: /Kroatien/ }));
    expect(onValue).toHaveBeenLastCalledWith("+38567123456", "HR");
    expect(screen.queryByRole("listbox")).toBeNull();
  }, LIST_TIMEOUT);

  it("names countries in the provider locale (en, and an app's own locale through its alias)", () => {
    inLocale(<PhoneField label="Phone" defaultValue="+38267123456" />, "en-US");
    expect(screen.getByRole("button", { name: "Country: Montenegro, +382" })).toBeTruthy();
    cleanup();
    // "me" is not a tag Intl reads as Montenegrin: the app registers what stands in for it, and its own words.
    registerLocaleAliases({ me: "sr-Latn-ME" });
    registerDsStrings("me", { phoneCountry: "Država: {country}, {code}" });
    inLocale(<PhoneField label="Telefon" defaultValue="+38267123456" />, "me");
    expect(screen.getByRole("button", { name: "Država: Crna Gora, +382" })).toBeTruthy();
  });

  it("keeps the number left to right in RTL, and works inside a Dialog", async () => {
    inLocale(<PhoneField label="هاتف" defaultValue="+38267123456" />, "ar-AE");
    expect(screen.getByRole("textbox", { name: "هاتف" }).getAttribute("dir")).toBe("ltr");
    cleanup();
    inLocale(
      <DialogTrigger>
        <Button>Open</Button>
        <Dialog title="Customer">
          <PhoneField label="Phone" description="WhatsApp" defaultValue="" />
        </Dialog>
      </DialogTrigger>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    const input = await screen.findByRole("textbox", { name: "Phone" }, FIND);
    expect(document.getElementById(input.getAttribute("aria-describedby")!)!.textContent).toBe("WhatsApp");
  });

  it("disabled: the country is shown, not a button, and nothing is submitted; otherwise a hidden input submits the E.164 value", () => {
    inLocale(<PhoneField label="Phone" defaultValue="+38220234567" isDisabled name="phone" />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByRole("img", { name: "Country: Montenegro, +382" })).toBeTruthy();
    expect(document.querySelector("input[name='phone']")).toBeNull();
    cleanup();
    inLocale(<PhoneField label="Phone" defaultValue="+38220234567" isReadOnly name="phone" />);
    expect((document.querySelector("input[name='phone']") as HTMLInputElement).value).toBe("+38220234567");
  });

  it("Backspace beside a group space removes the digit before it", () => {
    const onValue = vi.fn();
    inLocale(<Controlled start="+38267123456" onValue={onValue} />);
    const input = screen.getByRole("textbox", { name: "Phone" }) as HTMLInputElement;
    act(() => input.focus());
    input.setSelectionRange(3, 3); // after "67 "
    fireEvent.keyDown(input, { key: "Backspace" });
    expect(onValue).toHaveBeenLastCalledWith("+3826123456", "ME");
  });

  it("keyboard: the search box drives the list (arrows, Enter picks), Esc closes", async () => {
    const onValue = vi.fn();
    inLocale(<Controlled onValue={onValue} start="+38267123456" />);
    fireEvent.click(screen.getByRole("button", { name: "Country: Montenegro, +382" }));
    const search = await screen.findByRole("searchbox", { name: "Search countries" }, FIND);
    expect(document.activeElement).toBe(search);
    type(search, "germany");
    fireEvent.keyDown(search, { key: "ArrowDown" });
    fireEvent.keyDown(search, { key: "Enter" });
    expect(onValue).toHaveBeenLastCalledWith("+4967123456", "DE");
    fireEvent.click(screen.getByRole("button", { name: "Country: Germany, +49" }));
    const again = await screen.findByRole("searchbox", { name: "Search countries" }, FIND);
    fireEvent.keyDown(again, { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
  }, LIST_TIMEOUT);

  it("a value set from outside clears the length error until the next blur; a switch names the new country", () => {
    function Resettable() {
      const [value, setValue] = React.useState("");
      return (
        <>
          <PhoneField label="Phone" defaultCountry="ME" value={value} onChange={(next) => setValue(next)} />
          <button type="button" onClick={() => setValue("")}>Reset</button>
        </>
      );
    }
    inLocale(<Resettable />);
    const input = screen.getByRole("textbox", { name: "Phone" });
    type(input, "671");
    fireEvent.blur(input);
    expect(document.querySelector("[data-slot='field-error']")!.textContent).toContain("Montenegro numbers have 8 digits");
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(document.querySelector("[data-slot='field-error']")).toBeNull();
    expect(input.getAttribute("aria-invalid")).toBeNull();
  });

  it("picking the current country closes the list and keeps the value", async () => {
    const onValue = vi.fn();
    inLocale(<Controlled onValue={onValue} start="+38267123456" />);
    fireEvent.click(screen.getByRole("button", { name: "Country: Montenegro, +382" }));
    const listbox = await screen.findByRole("listbox", { name: "Country" }, FIND);
    fireEvent.click(within(listbox).getByRole("option", { name: /Montenegro/ }));
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(onValue).not.toHaveBeenCalled();
  }, LIST_TIMEOUT);

  it("a pasted +1 number is American, as a stored one reads back", () => {
    const onValue = vi.fn();
    // Opened on Montenegro, so the paste is what moves it to the United States.
    inLocale(<Controlled onValue={onValue} />, "en-US");
    expect(screen.getByRole("button", { name: "Country: Montenegro, +382" })).toBeTruthy();
    fireEvent.paste(screen.getByRole("textbox", { name: "Phone" }), { clipboardData: { getData: () => "+1 212 555 1234" } });
    expect(onValue).toHaveBeenLastCalledWith("+12125551234", "US");
    expect(screen.getByRole("button", { name: "Country: United States, +1" })).toBeTruthy();
  });

  // Suspected source bug, kept visible: with a defaultCountry that names no country the field opens on the phone
  // table's first row (Albania, since the table is sorted by ISO code), not on the locale's country. This flips to a
  // failure, to be turned back into a plain `it`, once the fallback is fixed.
  it("an unknown defaultCountry falls back to the locale's country", () => {
    inLocale(<PhoneField label="Phone" defaultCountry="UK" />);
    expect(screen.getByRole("button", { name: "Country: United States, +1" })).toBeTruthy();
  });

  it("a Form's server error for its name reaches the field", () => {
    inLocale(
      <Form validationErrors={{ phone: "This number belongs to another account." }}>
        <PhoneField label="Phone" name="phone" defaultValue="+38267123456" />
      </Form>,
    );
    const input = screen.getByRole("textbox", { name: "Phone" });
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(document.querySelector("[data-slot='field-error']")!.textContent).toBe("This number belongs to another account.");
  });
});

describe("PhoneField: an empty field opens on the locale's country", () => {
  const country = () => document.querySelector("[data-slot='phone-field-country']")!.getAttribute("aria-label");

  it("en: the United States, the region English most likely means", () => {
    inLocale(<PhoneField label="Phone" />, "en");
    expect(country()).toBe("Country: United States, +1");
  });

  it("de-AT: Austria, the locale's own region, and a typed number is stored under it", () => {
    const onChange = vi.fn();
    inLocale(<PhoneField label="Phone" onChange={onChange} />, "de-AT");
    expect(country()).toBe("Country: Österreich, +43");
    type(screen.getByRole("textbox", { name: "Phone" }), "0664 123 4567");
    expect(onChange).toHaveBeenLastCalledWith("+436641234567", "AT");
  });

  it("an app's private tag opens on the region of the locale registered for it", () => {
    registerLocaleAliases({ "x-shop": "sr-Latn-ME" });
    inLocale(<PhoneField label="Phone" />, "x-shop");
    expect(document.querySelector("[data-slot='phone-field-iso']")!.textContent).toBe("ME");
    // Only the country and its code: the words around them are whichever strings the app registered for the tag.
    expect(country()).toMatch(/: Crna Gora, \+382$/);
  });

  it("defaultCountry and a stored number still win over the locale", () => {
    inLocale(<PhoneField label="Phone" defaultCountry="ME" />, "de-AT");
    expect(country()).toBe("Country: Montenegro, +382");
    cleanup();
    inLocale(<PhoneField label="Phone" defaultValue="+905321234567" />, "de-AT");
    expect(country()).toBe("Country: Türkei, +90");
  });
});

describe("PhoneField: length errors and a Form's server errors over time", () => {
  it("after a blur, typing only clears the length error; a new one waits for the next blur", () => {
    inLocale(<Controlled start="+38267123456" />);
    const input = screen.getByRole("textbox", { name: "Phone" });
    fireEvent.blur(input);
    expect(document.querySelector("[data-slot='field-error']")).toBeNull();
    type(input, "67 123 45");
    expect(document.querySelector("[data-slot='field-error']")).toBeNull();
    fireEvent.blur(input);
    expect(document.querySelector("[data-slot='field-error']")!.textContent).toContain("have 8 digits");
    type(input, "67 123 456");
    expect(document.querySelector("[data-slot='field-error']")).toBeNull();
    type(input, "67 123 45");
    expect(document.querySelector("[data-slot='field-error']")).toBeNull();
  });

  it("a Form's server errors behave as in every DS field: a repeat of the same message shows again", () => {
    function Server() {
      const [value, setValue] = React.useState("+38267123456");
      const [errors, setErrors] = React.useState<Record<string, string>>({ phone: "This number belongs to another account." });
      return (
        <>
          <Form validationErrors={errors}>
            <PhoneField label="Phone" name="phone" value={value} onChange={(next) => setValue(next)} />
          </Form>
          <button type="button" onClick={() => setErrors({})}>Clear</button>
          <button type="button" onClick={() => setErrors({ phone: "This number belongs to another account." })}>Submit</button>
        </>
      );
    }
    inLocale(<Server />);
    const input = screen.getByRole("textbox", { name: "Phone" });
    const error = () => document.querySelector("[data-slot='field-error']")?.textContent ?? null;
    expect(error()).toBe("This number belongs to another account.");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(error()).toBeNull();
    // The server says the same again after a resubmit: it shows again (it was hidden by identity before).
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    expect(error()).toBe("This number belongs to another account.");
    // The number's own input is not submitted under the name; the hidden input carries the E.164 value.
    expect(input.getAttribute("name")).toBe("");
    expect((document.querySelector("input[type='hidden'][name='phone']") as HTMLInputElement).value).toBe("+38267123456");
  });
});
