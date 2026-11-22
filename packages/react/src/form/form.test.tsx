import fs from "node:fs";
import * as React from "react";
import { createTheme, toCSS } from "@senvenli/tokens";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Input as AriaInput, TextField as AriaTextField } from "react-aria-components";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { FieldDescription, FieldError, FieldLabel, Form, FormFooter, FormRow, FormSection, InputAction, InputAddon, InputGroup, TextArea, passwordStrength } from "./index";
import { PasswordField } from "./password-field";
import { SearchField } from "./search-field";
import { TextField } from "./text-field";
import * as styles from "./styles";
import { TEXTAREA_MAX_HEIGHT } from "./text-area";
import { DS_STRENGTH, DS_STRINGS, optionalLabel, overLimitLabel, registerDsStrings, requiredLabel, strengthLabels } from "../i18n";
import { Icon } from "../display/icon";

afterEach(cleanup);

// A helper, not an inline `new URL("…", import.meta.url)`: Vite rewrites that literal form into an asset URL.
const here = (file: string) => new URL(file, import.meta.url);
const theme = toCSS(createTheme(), { tailwind: true }) + fs.readFileSync(here("../../styles/theme.css"), "utf8");
const PHYSICAL = /(^|\s|:)(-?m[lr]-|p[lr]-|left-|right-|border-[lr](-|\s|$)|rounded-[lr]-|text-left|text-right)/;
const classesOf = (element: Element | null) => element?.getAttribute("class") ?? "";

function inLocale(ui: React.ReactElement, locale = "en") {
  return render(<DesignSystemProvider locale={locale} navigate={vi.fn()}>{ui}</DesignSystemProvider>);
}

describe("form recipes", () => {
  const recipes = Object.values(styles).filter((value): value is string => typeof value === "string")
    .concat(Object.values(styles.FIELD_SIZE)).join(" ").split(/\s+/);

  it("only use tokens that exist in the theme", () => {
    for (const utility of recipes) {
      const color = /(?:^|:)(?:bg|text|border|inset-ring|placeholder:text)-(ds-[a-z-]+)$/.exec(utility);
      if (color && !/^ds-control/.test(color[1])) {
        const name = color[1];
        const typeStyle = theme.includes(`--text-${name.replace(/^ds-/, "")}:`);
        expect(theme.includes(`--color-${name}:`) || typeStyle, utility).toBe(true);
      }
      const space = /(?:^|:)-?(?:h|w|min-h|px|py|gap|size)-(ds-[a-z0-9-]+)$/.exec(utility);
      if (space) expect(theme, utility).toContain(`--spacing-${space[1]}:`);
    }
  });

  it("mark focus with a 2px edge inside the field, never a ring outside it", () => {
    expect(styles.FIELD_FRAME).toContain("data-[focus-within]:border-ds-border-focused");
    expect(styles.FIELD_FRAME).toContain("data-[focus-within]:-outline-offset-2");
    expect(styles.FIELD_FRAME).toContain("data-[invalid]:border-ds-border-danger");
    const all = recipes.join(" ");
    // Only inward (negative) outline offsets; no outward ring or offset.
    expect(all).not.toMatch(/(^|\s|:)outline-offset-|(^|\s)ring-|(^|\s)focus:/);
    expect(all).not.toMatch(/outline-2/);
  });

  it("use logical sides only", () => {
    for (const utility of recipes) expect(utility).not.toMatch(PHYSICAL);
  });
});

describe("TextField", () => {
  it("associates label, description and error through React Aria", () => {
    inLocale(
      <TextField label="Email" description="We send the invoice to this address." isRequired isInvalid errorMessage="Enter a valid email: name@example.com" defaultValue="ana@example" />,
    );
    const input = screen.getByRole("textbox", { name: "Email" });
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-required") === "true" || input.hasAttribute("required")).toBe(true);
    const describedBy = (input.getAttribute("aria-describedby") ?? "").split(" ").map((id) => document.getElementById(id)?.textContent);
    expect(describedBy).toContain("We send the invoice to this address.");
    expect(describedBy.join(" ")).toContain("Enter a valid email");
    const required = document.querySelector('[data-slot="field-required"]');
    expect(required?.getAttribute("aria-hidden")).toBe("true");
    expect(document.querySelector('[data-slot="input-group"]')?.hasAttribute("data-invalid")).toBe(true);
    const labelledBy = input.getAttribute("aria-labelledby") ?? "";
    const labelFor = document.querySelector("label")?.getAttribute("for");
    expect(labelledBy.split(" ").some((id) => document.getElementById(id)?.tagName === "LABEL") || labelFor === input.id).toBe(true);
  });

  it("wires the exported parts in a composed field", () => {
    inLocale(
      <AriaTextField isInvalid validationBehavior="aria" defaultValue="48210">
        <FieldLabel isRequired>Distance</FieldLabel>
        <InputGroup isInvalid>
          <AriaInput />
          <InputAddon position="end">km</InputAddon>
        </InputGroup>
        <FieldDescription>Last reading 48,300 km.</FieldDescription>
        <FieldError>Distance cannot be below the last reading.</FieldError>
      </AriaTextField>,
    );
    const input = screen.getByRole("textbox", { name: "Distance" });
    const described = (input.getAttribute("aria-describedby") ?? "").split(" ").map((id) => document.getElementById(id)?.textContent ?? "");
    expect(described.join(" ")).toContain("Last reading 48,300 km.");
    expect(described.join(" ")).toContain("Distance cannot be below the last reading.");
    expect(input.getAttribute("aria-invalid")).toBe("true");
  });

  it("shows a new error only at the next blur, but clears a fixed one live", () => {
    inLocale(<TextField label="Code" validate={(value) => (value.length === 4 ? null : "Enter 4 digits.")} />);
    const input = screen.getByRole("textbox", { name: "Code" }) as HTMLInputElement;
    act(() => input.focus());
    fireEvent.change(input, { target: { value: "12" } });
    act(() => input.blur());
    expect(input.getAttribute("aria-invalid")).toBe("true");
    act(() => input.focus());
    fireEvent.change(input, { target: { value: "1234" } });
    expect(input.getAttribute("aria-invalid")).toBeNull();
    fireEvent.change(input, { target: { value: "12345" } });
    expect(input.getAttribute("aria-invalid")).toBeNull();
    act(() => input.blur());
    expect(input.getAttribute("aria-invalid")).toBe("true");
  });

  it("passes validation straight through in native mode", () => {
    const validate = vi.fn(() => "Error");
    inLocale(<TextField label="Name" validationBehavior="native" validate={validate} defaultValue="x" />);
    expect(validate).toHaveBeenCalled();
  });

  it("shows the optional mark in the provider locale: a registered language, with English as the fallback", () => {
    registerDsStrings("de", { optional: "(freiwillig)" });
    // A regional tag uses its language's strings; a language nobody registered gets English.
    for (const [locale, mark] of [["de", "(freiwillig)"], ["de-AT", "(freiwillig)"], ["en", DS_STRINGS.optional.en], ["nl", DS_STRINGS.optional.en]] as const) {
      const { unmount } = inLocale(<TextField label="Date of birth" isOptional />, locale);
      expect(document.querySelector('[data-slot="field-optional"]')?.textContent, locale).toBe(mark);
      unmount();
    }
    expect(DS_STRINGS.optional.en).toBe("(optional)");
  });

  it("validates on blur, not per keystroke, and keeps the text", () => {
    inLocale(
      <Form>
        <TextField label="Promo code" validate={(value) => (value.length < 4 ? "Enter at least 4 characters." : null)} />
      </Form>,
    );
    const input = screen.getByRole("textbox", { name: "Promo code" }) as HTMLInputElement;
    act(() => input.focus());
    fireEvent.change(input, { target: { value: "AB" } });
    expect(input.getAttribute("aria-invalid")).toBeNull();
    act(() => input.blur());
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.value).toBe("AB");
    expect(screen.getByText("Enter at least 4 characters.")).toBeTruthy();
  });

  it("renders text, unit and icon affixes and sets code / numeric type", () => {
    inLocale(
      <>
        <TextField label="Price" leading="€" variant="numeric" defaultValue="62.00" />
        <TextField label="Order number" variant="code" defaultValue="AB-482" />
        <TextField label="Search" leading={<Icon name="search" />} />
      </>,
    );
    expect(screen.getByText("€").getAttribute("data-slot")).toBe("input-addon");
    expect(classesOf(screen.getByRole("textbox", { name: "Price" }))).toContain("tabular-nums");
    expect(classesOf(screen.getByRole("textbox", { name: "Order number" }))).toContain("font-ds-mono");
    // The <Icon> itself becomes the field icon (same slot as SearchField's), decorative and subtle.
    const mark = document.querySelector('svg[data-slot="field-icon"]');
    expect(mark?.getAttribute("data-icon")).toBe("search");
    expect(mark?.getAttribute("aria-hidden")).toBe("true");
    expect(mark?.getAttribute("class")).toContain("text-ds-icon-subtle");
  });

  it("goes compact for toolbars and disables cleanly", () => {
    inLocale(<TextField label="Branch" size="small" isDisabled defaultValue="Main office" />);
    const group = document.querySelector('[data-slot="input-group"]')!;
    expect(classesOf(group)).toContain("min-h-ds-control-compact");
    expect(group.hasAttribute("data-disabled")).toBe(true);
    expect((screen.getByRole("textbox") as HTMLInputElement).disabled).toBe(true);
  });
});

describe("InputGroup focus forwarding", () => {
  it("focuses the input when an addon is pressed, even with a consumer onClick", () => {
    const onClick = vi.fn();
    render(
      <InputGroup>
        <InputAddon onClick={onClick}>https://</InputAddon>
        <input aria-label="Domain" />
      </InputGroup>,
    );
    fireEvent.click(screen.getByText("https://"));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Domain" }));
  });

  it("focuses a textarea inside the frame", () => {
    render(
      <InputGroup multiline>
        <textarea aria-label="Note" />
      </InputGroup>,
    );
    fireEvent.mouseDown(document.querySelector('[data-slot="input-group"]')!);
    expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Note" }));
  });

  it("does not hijack a select inside an addon", () => {
    render(
      <InputGroup>
        <input aria-label="Amount" />
        <InputAddon position="end">
          <select aria-label="Currency" defaultValue="EUR"><option>EUR</option><option>USD</option></select>
        </InputAddon>
      </InputGroup>,
    );
    const select = screen.getByRole("combobox", { name: "Currency" });
    const event = new MouseEvent("mousedown", { bubbles: true, cancelable: true });
    select.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });

  it("keeps inline actions pressable without stealing focus to the input", () => {
    const onPress = vi.fn();
    render(
      <InputGroup>
        <input aria-label="API key" readOnly defaultValue="key_live_3f9a" />
        <InputAction icon="copy" aria-label="Copy" onPress={onPress} />
      </InputGroup>,
    );
    const action = screen.getByRole("button", { name: "Copy" });
    expect(action.getAttribute("type")).toBe("button");
    fireEvent.click(action);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe("TextArea", () => {
  it("counts characters, lets the user type past the limit and turns invalid", () => {
    inLocale(<TextArea label="Delivery note" maxLength={10} defaultValue="Memo" />);
    const area = screen.getByRole("textbox", { name: "Delivery note" }) as HTMLTextAreaElement;
    const counter = document.querySelector('[data-slot="text-area-counter"]')!;
    expect(counter.textContent).toBe("4 / 10");
    expect(area.getAttribute("maxlength")).toBeNull();
    expect((area.getAttribute("aria-describedby") ?? "").split(" ")).toContain(counter.id);
    fireEvent.change(area, { target: { value: "Gate B, bay 14" } });
    expect(area.value).toBe("Gate B, bay 14");
    expect(counter.textContent).toBe("14 / 10");
    expect(classesOf(counter)).toContain("text-ds-text-danger");
    expect(document.querySelector('[data-slot="text-area-limit-status"]')?.textContent).toBe("Character limit exceeded");
    // Not invalid while typing; invalid once the field loses focus.
    expect(area.getAttribute("aria-invalid")).toBeNull();
    act(() => area.focus());
    act(() => area.blur());
    expect(area.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText("4 characters over the limit")).toBeTruthy();
  });

  it("grows with content up to the design maximum, then scrolls", () => {
    inLocale(<TextArea label="Details" />);
    const area = screen.getByRole("textbox") as HTMLTextAreaElement;
    Object.defineProperty(area, "scrollHeight", { configurable: true, get: () => 900 });
    fireEvent.change(area, { target: { value: "line\n".repeat(60) } });
    expect(parseFloat(area.style.height)).toBeLessThanOrEqual(TEXTAREA_MAX_HEIGHT);
    expect(area.style.overflowY).toBe("auto");
  });
});

describe("SearchField", () => {
  it("shows clear only with text, clears on Esc and submits on Enter", () => {
    const onSubmit = vi.fn();
    inLocale(<SearchField aria-label="Search" placeholder="Order number, customer or email" shortcut="/" onSubmit={onSubmit} />);
    const input = screen.getByRole("searchbox", { name: "Search" }) as HTMLInputElement;
    expect(document.querySelector('[data-slot="search-field-shortcut"]')?.textContent).toBe("/");
    expect(screen.queryByRole("button", { name: "Clear" })).toBeNull();
    fireEvent.change(input, { target: { value: "AB 48" } });
    expect(screen.getByRole("button", { name: "Clear" })).toBeTruthy();
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSubmit).toHaveBeenCalledWith("AB 48");
    fireEvent.keyDown(input, { key: "Escape" });
    expect(input.value).toBe("");
  });
});

describe("PasswordField", () => {
  it("reveals and hides with a named, pressed toggle and keeps the value", () => {
    inLocale(<PasswordField label="Password" autoComplete="current-password" defaultValue="sunflower2026" />);
    const input = screen.getByLabelText("Password") as HTMLInputElement;
    expect(input.type).toBe("password");
    expect(input.getAttribute("autocomplete")).toBe("current-password");
    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(input.type).toBe("text");
    expect(input.value).toBe("sunflower2026");
    // The label carries the state; no aria-pressed on top of a changing label.
    expect(screen.getByRole("button", { name: "Hide password" }).hasAttribute("aria-pressed")).toBe(false);
  });

  it("scores strength and shows the word with filled segments", () => {
    expect(passwordStrength("")).toBe(0);
    expect(passwordStrength("abc")).toBe(1);
    expect(passwordStrength("sunflower26")).toBe(2);
    expect(passwordStrength("Sunflower-2026!")).toBe(3);
    // Letters of every script count, not only ASCII ones.
    expect(passwordStrength("Ελληνικά-2026")).toBe(3);
    expect(passwordStrength("žluťoučký26")).toBe(2);
    inLocale(<PasswordField label="New password" autoComplete="new-password" showStrength defaultValue="Sunflower-2026!" />);
    expect(document.querySelector('[data-slot="password-strength-label"]')?.textContent).toBe("Strong");
    expect(document.querySelectorAll("[data-slot='password-strength'] [data-filled]")).toHaveLength(4);
    expect(document.querySelector('[data-slot="password-strength-label"]')?.getAttribute("aria-live")).toBe("polite");
  });
});

describe("Form", () => {
  it("focuses the first invalid field on submit and does not call onSubmit", () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    inLocale(
      <Form onSubmit={onSubmit}>
        <FormSection legend="Contact details">
          <FormRow>
            <TextField label="First name" defaultValue="Ana" />
            <TextField label="Last name" isInvalid errorMessage="Enter the last name." />
          </FormRow>
        </FormSection>
        <FormFooter>
          <button type="submit">Save</button>
        </FormFooter>
      </Form>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Last name" }));
    expect(screen.getByRole("group", { name: "Contact details" }).tagName).toBe("FIELDSET");
  });

  it("blocks submit on an empty required field, with the localized message", () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    inLocale(
      <Form onSubmit={onSubmit}>
        <TextField label="Name" isRequired />
        <button type="submit">Save</button>
      </Form>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Name" }));
    expect(screen.getByText("Fill in this field.")).toBeTruthy();
  });

  it("blocks submit on a field invalid only through validate, and on a TextArea over its limit", () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    inLocale(
      <Form onSubmit={onSubmit}>
        <TextField label="Promo code" defaultValue="AB" validate={(v) => (v.length < 4 ? "At least 4 characters." : null)} />
        <TextArea label="Note" maxLength={3} defaultValue="Long note" />
        <button type="submit">Save</button>
      </Form>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Promo code" }));
    expect(screen.getByRole("textbox", { name: "Note" }).getAttribute("aria-invalid")).toBe("true");
  });

  it("forgets shown errors on reset", () => {
    inLocale(
      <Form>
        <TextField label="Name" isRequired />
        <button type="submit">Save</button>
        <button type="reset">Reset</button>
      </Form>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByRole("textbox", { name: "Name" }).getAttribute("aria-invalid")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.getByRole("textbox", { name: "Name" }).getAttribute("aria-invalid")).toBeNull();
  });

  it("judges the reset value, not the last typed one, on the first blur after a reset", () => {
    inLocale(
      <Form>
        <TextField label="Name" defaultValue="Ana" validate={(value) => (value.length < 3 ? "At least 3 letters" : null)} />
        <button type="reset">Reset</button>
      </Form>,
    );
    const input = screen.getByRole("textbox", { name: "Name" }) as HTMLInputElement;
    act(() => input.focus());
    fireEvent.change(input, { target: { value: "A" } });
    act(() => input.blur());
    expect(input.getAttribute("aria-invalid")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(input.value).toBe("Ana");
    act(() => input.focus());
    act(() => input.blur());
    expect(input.getAttribute("aria-invalid")).toBeNull();
  });

  it("submits when every field is valid", () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    inLocale(
      <Form onSubmit={onSubmit}>
        <TextField label="Name" defaultValue="Ana" />
        <button type="submit">Save</button>
      </Form>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});

describe("built-in strings", () => {
  it("are complete in English; a registered language replaces them and any other falls back to English", () => {
    for (const [key, table] of Object.entries(DS_STRINGS)) expect((table as Record<string, string>).en, key).toBeTruthy();
    expect(DS_STRENGTH.en).toHaveLength(3);
    registerDsStrings("de", { required: "Pflichtfeld.", overLimit: "{n} Zeichen zu viel", strength: ["Schwach", "Mittel", "Stark"] });
    for (const locale of ["de", "de-AT"]) {
      expect(requiredLabel(locale), locale).toBe("Pflichtfeld.");
      expect(overLimitLabel(locale, 2), locale).toBe("2 Zeichen zu viel");
      expect(strengthLabels(locale), locale).toEqual(["Schwach", "Mittel", "Stark"]);
    }
    for (const locale of ["en", "en-GB", "nl", "xx"]) {
      expect(requiredLabel(locale), locale).toBe("Fill in this field.");
      expect(overLimitLabel(locale, 2), locale).toBe("2 characters over the limit");
      expect(strengthLabels(locale), locale).toEqual(DS_STRENGTH.en);
      expect(optionalLabel(locale), locale).toBe("(optional)");
    }
  });
});

describe("right-to-left", () => {
  it("renders every field part without physical classes", () => {
    const { container } = inLocale(
      <div dir="rtl">
        <TextField label="ا" leading="€" />
        <TextArea label="ب" maxLength={5} />
        <SearchField aria-label="ت" defaultValue="ث" />
        <PasswordField label="ج" autoComplete="new-password" showStrength defaultValue="Abcdefgh12!" />
      </div>,
      "ar",
    );
    const parts = Array.from(container.querySelectorAll("[data-slot]"));
    expect(parts.length).toBeGreaterThan(15);
    for (const part of parts) expect(classesOf(part)).not.toMatch(PHYSICAL);
  });
});
