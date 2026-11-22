import * as React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { FieldError } from "./field-parts";
import { Field } from "./index";
import { TextField } from "./text-field";
import type { Key } from "react-aria-components";
import { ComboBox, Select } from "../selection/index";
import { MultiSelect } from "../selection/multi-select";

// Field label id and invalid forwarding: a picker can sit in the Field, which owns the label and the error text.
// The label gets `{controlId}-label`, and a DS control handed the Field's `aria-invalid` shows the invalid state
// without a second, empty error row of its own.

if (typeof globalThis.CSS === "undefined" || typeof globalThis.CSS.escape !== "function") {
  Object.assign(globalThis, { CSS: { ...(globalThis.CSS ?? {}), escape: (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`) } });
}

let warn: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  warn.mockRestore();
});

function inLocale(ui: React.ReactElement, locale = "en", dir?: "rtl") {
  return render(
    <div dir={dir}>
      <DesignSystemProvider locale={locale} navigate={vi.fn()}>{ui}</DesignSystemProvider>
    </div>,
  );
}

const COUNTRIES = [
  { id: "DE", label: "Germany" },
  { id: "FR", label: "France" },
];

const ids = (element: Element, attribute: string) => (element.getAttribute(attribute) ?? "").split(" ").filter(Boolean);
/** The accessible description as a screen reader builds it from aria-describedby (the referenced texts, in order). */
const computeAccessibleDescription = (element: Element) =>
  ids(element, "aria-describedby").map((id) => document.getElementById(id)?.textContent?.trim() ?? "").filter(Boolean).join(" ");
const duplicateIds = () => {
  const all = [...document.querySelectorAll("[id]")].map((element) => element.id);
  return all.filter((id, index) => all.indexOf(id) !== index);
};

describe("Field label id", () => {
  it("the label's id is {htmlFor}-label; for and the control's id are unchanged", () => {
    inLocale(
      <Field label="Name" htmlFor="name">
        <input id="name" />
      </Field>,
    );
    const label = document.querySelector("label")!;
    expect(label.id).toBe("name-label");
    expect(label.getAttribute("for")).toBe("name");
    expect(screen.getByRole("textbox", { name: "Name" }).id).toBe("name");
  });

  it("a generated control id gets a label id from it too, and a control can be named through aria-labelledby", () => {
    inLocale(
      <Field label="Code">
        <LabelledInput />
      </Field>,
    );
    const label = document.querySelector("label")!;
    const input = screen.getByRole("textbox", { name: "Code" });
    expect(label.id).toBe(`${input.id}-label`);
    expect(ids(input, "aria-labelledby")).toEqual([label.id]);
  });

  it("no label, no id", () => {
    const { container } = inLocale(
      <Field errorMessage="Required">
        <input />
      </Field>,
    );
    expect(container.querySelector("label")).toBeNull();
    expect(container.querySelector("[id$='-label']")).toBeNull();
  });

  it("two Fields on a page: no duplicate ids", () => {
    inLocale(
      <>
        <Field label="Name" errorMessage="Required">
          <input />
        </Field>
        <Field label="Surname" description="As on your ID">
          <input />
        </Field>
        <Field label="Country" htmlFor="country" errorMessage="Select a country">
          <ComboBox id="country" items={COUNTRIES} />
        </Field>
      </>,
    );
    expect(duplicateIds()).toEqual([]);
    expect(document.querySelectorAll("label[id$='-label']")).toHaveLength(3);
  });

  it.each([["single", false], ["multiple", true]] as const)(
    "%s ComboBox in a Field: the input is labelled by the Field's label id, in the server render and after hydration",
    (_, multiple) => {
      const row = (
        <Field label={<>Shipping country<span aria-hidden="true">*</span></>} htmlFor="countryCode">
          {multiple ? <ComboBox selectionMode="multiple" id="countryCode" items={COUNTRIES} /> : <ComboBox id="countryCode" items={COUNTRIES} />}
        </Field>
      );
      const html = renderToStaticMarkup(<DesignSystemProvider locale="en" navigate={vi.fn()}>{row}</DesignSystemProvider>);
      // The server render's reference now resolves: the label carries the id it points at.
      expect(html).toContain('id="countryCode-label"');
      expect(html).toContain('aria-labelledby="countryCode-label"');
      inLocale(row);
      const input = screen.getByRole("combobox", { name: "Shipping country" });
      expect(ids(input, "aria-labelledby")).toEqual(["countryCode-label"]);
      expect(input.hasAttribute("aria-label")).toBe(false);
      expect(duplicateIds()).toEqual([]);
      expect(warn.mock.calls.map(([message]: unknown[]) => String(message)).filter((message: string) => message.startsWith("ComboBox:"))).toEqual([]);
    },
  );

  it("RTL: the label id and the name are the same in an Arabic page", () => {
    inLocale(
      <Field label="البلد" htmlFor="country">
        <ComboBox id="country" items={COUNTRIES} />
      </Field>,
      "ar",
      "rtl",
    );
    const input = screen.getByRole("combobox", { name: "البلد" });
    expect(input.getAttribute("aria-labelledby")).toBe("country-label");
    expect(document.getElementById("country-label")!.closest("[dir='rtl']")).not.toBeNull();
  });
});

/** A control that names itself by the Field's label (the case the id is for). */
function LabelledInput(props: { id?: string }) {
  return <input {...props} aria-labelledby={props.id ? `${props.id}-label` : undefined} />;
}

describe("Field invalid forwarding", () => {
  it.each([["single", false], ["multiple", true]] as const)(
    "%s ComboBox: the Field's error makes it invalid; its only error row is the Field's, which describes it",
    (_, multiple) => {
      inLocale(
        <Field label="Country" htmlFor="cc" errorMessage="Select a country.">
          {multiple ? <ComboBox selectionMode="multiple" id="cc" items={COUNTRIES} /> : <ComboBox id="cc" items={COUNTRIES} />}
        </Field>,
      );
      const input = screen.getByRole("combobox", { name: "Country" });
      expect(input.getAttribute("aria-invalid")).toBe("true");
      expect(document.querySelector("[data-slot='combobox']")!.hasAttribute("data-invalid")).toBe(true);
      expect(document.querySelector("[data-slot='combobox-field']")!.hasAttribute("data-invalid")).toBe(true);
      expect(document.querySelector("[data-slot='field-error']")).toBeNull();
      expect(document.querySelector("[data-slot='field-error-icon']")).toBeNull();
      expect(computeAccessibleDescription(input)).toBe("Select a country.");
      for (const id of ids(input, "aria-describedby")) expect(document.getElementById(id)).not.toBeNull();
    },
  );

  it("without an error nothing is invalid", () => {
    inLocale(
      <Field label="Country" htmlFor="cc">
        <ComboBox id="cc" items={COUNTRIES} />
      </Field>,
    );
    const input = screen.getByRole("combobox", { name: "Country" });
    expect(input.hasAttribute("aria-invalid")).toBe(false);
    expect(document.querySelector("[data-invalid]")).toBeNull();
  });

  it("keyboard: the invalid control still opens with ArrowDown and picks with Enter; the app clears the error", async () => {
    function Row() {
      const [value, setValue] = React.useState<Key | null>(null);
      return (
        <Field label="Country" htmlFor="cc" errorMessage={value ? undefined : "Select a country."}>
          <ComboBox id="cc" items={COUNTRIES} selectedKey={value} onSelectionChange={setValue} />
        </Field>
      );
    }
    inLocale(<Row />);
    const input = screen.getByRole("combobox", { name: "Country" }) as HTMLInputElement;
    await act(async () => input.focus());
    await act(async () => {
      fireEvent.keyDown(input, { key: "ArrowDown" });
      fireEvent.keyUp(input, { key: "ArrowDown" });
    });
    expect(screen.getByRole("listbox")).toBeTruthy();
    await act(async () => {
      fireEvent.keyDown(input, { key: "Enter" });
      fireEvent.keyUp(input, { key: "Enter" });
    });
    expect(input.value).toBe("Germany");
    expect(input.hasAttribute("aria-invalid")).toBe(false);
    expect(computeAccessibleDescription(input)).toBe("");
  });

  it("MultiSelect and Select: the Field's aria-invalid marks the field invalid (data-invalid), no empty row", () => {
    inLocale(
      <>
        <Field label="Countries" htmlFor="ms" errorMessage="Select at least one country.">
          <MultiSelect aria-label="Countries" items={COUNTRIES} />
        </Field>
        <Field label="Country" htmlFor="sl" errorMessage="Select a country.">
          <Select aria-label="Country" items={COUNTRIES} />
        </Field>
      </>,
    );
    expect(document.querySelector("[data-slot='multi-select']")!.hasAttribute("data-invalid")).toBe(true);
    expect(document.querySelector("[data-slot='select']")!.hasAttribute("data-invalid")).toBe(true);
    expect(document.querySelector("[data-slot='field-error']")).toBeNull();
  });

  it("TextField: aria-invalid sets aria-invalid on its input; aria-invalid=\"false\" and false change nothing", () => {
    inLocale(
      <>
        <TextField label="One" {...{ "aria-invalid": true }} />
        <TextField label="Two" {...{ "aria-invalid": "true" as const }} />
        <TextField label="Three" {...{ "aria-invalid": "false" as const }} />
        <TextField label="Four" {...{ "aria-invalid": false }} />
      </>,
    );
    expect(screen.getByRole("textbox", { name: "One" }).getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByRole("textbox", { name: "Two" }).getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByRole("textbox", { name: "Three" }).hasAttribute("aria-invalid")).toBe(false);
    expect(screen.getByRole("textbox", { name: "Four" }).hasAttribute("aria-invalid")).toBe(false);
    expect(document.querySelector("[data-slot='field-error']")).toBeNull();
  });
});

describe("FieldError with no message", () => {
  it.each([
    ["TextField", () => <TextField label="Name" isInvalid />],
    ["ComboBox", () => <ComboBox label="Country" items={COUNTRIES} isInvalid />],
    ["MultiSelect", () => <MultiSelect label="Countries" items={COUNTRIES} isInvalid />],
    ["Select", () => <Select label="Country" items={COUNTRIES} isInvalid />],
  ] as const)("%s isInvalid without errorMessage: invalid, but no row, no icon and no dangling aria-describedby", (_, make) => {
    const { container } = inLocale(make());
    expect(container.querySelector("[data-invalid]")).not.toBeNull();
    expect(container.querySelector("[data-slot='field-error']")).toBeNull();
    expect(container.querySelector("[data-slot='field-error-icon']")).toBeNull();
    for (const element of container.querySelectorAll("[aria-describedby]")) {
      for (const id of ids(element, "aria-describedby")) expect(document.getElementById(id)).not.toBeNull();
    }
  });

  it("with a message the row, its icon and its text are there and describe the input, as before (LTR and RTL)", () => {
    for (const [locale, dir] of [["en", undefined], ["ar", "rtl"]] as const) {
      const { container, unmount } = inLocale(<TextField label="Email" isInvalid errorMessage="Enter a valid email." />, locale, dir);
      const row = container.querySelector("[data-slot='field-error']")!;
      expect(row.querySelector("[data-slot='field-error-icon']")!.getAttribute("aria-hidden")).toBe("true");
      expect(row.textContent).toBe("Enter a valid email.");
      const input = screen.getByRole("textbox", { name: "Email" });
      expect(ids(input, "aria-describedby")).toContain(row.id);
      expect(computeAccessibleDescription(input)).toBe("Enter a valid email.");
      unmount();
    }
  });

  it("a validate message still shows on blur with no static errorMessage (the message comes from validation)", async () => {
    inLocale(<TextField label="Name" validate={(value) => (value ? null : "Enter your name.")} />);
    const input = screen.getByRole("textbox", { name: "Name" });
    await act(async () => input.focus());
    await act(async () => input.blur());
    expect(document.querySelector("[data-slot='field-error']")!.textContent).toBe("Enter your name.");
  });

  it("0 is a message; empty strings, false and empty arrays are not", () => {
    inLocale(
      <>
        <TextField label="Zero" isInvalid errorMessage={0} />
        <TextField label="Empty" isInvalid errorMessage="" />
        <TextField label="False" isInvalid errorMessage={false} />
        <TextField label="Array" isInvalid errorMessage={[]} />
      </>,
    );
    const rows = [...document.querySelectorAll("[data-slot='field-error']")];
    expect(rows.map((row) => row.textContent)).toEqual(["0"]);
  });

  it("FieldError outside an invalid field renders nothing, as before", () => {
    const { container } = inLocale(<FieldError>Hidden</FieldError>);
    expect(container.querySelector("[data-slot='field-error']")).toBeNull();
  });
});

// FieldError and the choice rows share one content check, and an
// empty fragment is no message (it used to draw an icon row with empty text).
describe("one content check; an empty fragment is no message", () => {
  it("FieldError: <></>, a fragment of empties and a nested empty array draw no row; a fragment with text does", () => {
    inLocale(
      <>
        <TextField label="Fragment" isInvalid errorMessage={<></>} />
        <TextField label="Empty fragment" isInvalid errorMessage={<>{""}{null}{false}</>} />
        <TextField label="Nested" isInvalid errorMessage={[[], <React.Fragment key="a" />]} />
        <TextField label="Filled fragment" isInvalid errorMessage={<>Enter a valid email.</>} />
        <TextField label="Zero fragment" isInvalid errorMessage={<>{0}</>} />
      </>,
    );
    const rows = [...document.querySelectorAll("[data-slot='field-error']")];
    expect(rows.map((row) => row.textContent)).toEqual(["Enter a valid email.", "0"]);
    for (const name of ["Fragment", "Empty fragment", "Nested"]) {
      const input = screen.getByRole("textbox", { name });
      expect(input.getAttribute("aria-invalid")).toBe("true");
      expect(computeAccessibleDescription(input)).toBe("");
    }
    expect(computeAccessibleDescription(screen.getByRole("textbox", { name: "Filled fragment" }))).toBe("Enter a valid email.");
  });

  it("the choice rows use the same check: choice-text's hasContent is field-parts' one", async () => {
    const parts = await import("./field-parts");
    const choice = await import("../selection/choice-text");
    expect(choice.hasContent).toBe(parts.hasContent);
    expect([0, "a", <>a</>, [null, "b"]].map(parts.hasContent)).toEqual([true, true, true, true]);
    expect([undefined, null, false, true, "", [], <></>, <>{null}</>, [[""]]].map(parts.hasContent)).toEqual(
      [false, false, false, false, false, false, false, false, false],
    );
  });
});

// Select and MultiSelect open from a button, on which React
// Aria sets no aria-invalid; the forwarded invalid state is data-invalid on the field.
describe("Select and MultiSelect: invalid shows as data-invalid only", () => {
  it("the trigger button carries no aria-invalid; the field carries data-invalid", () => {
    inLocale(
      <>
        <MultiSelect label="Countries" items={COUNTRIES} {...{ "aria-invalid": true }} />
        <Select label="Country" items={COUNTRIES} {...{ "aria-invalid": true }} />
      </>,
    );
    for (const slot of ["multi-select", "select"]) {
      const field = document.querySelector(`[data-slot='${slot}']`)!;
      expect(field.hasAttribute("data-invalid")).toBe(true);
      const trigger = field.querySelector(`[data-slot='${slot}-trigger']`)!;
      expect(trigger.tagName).toBe("BUTTON");
      expect(trigger.hasAttribute("aria-invalid")).toBe(false);
    }
  });
});
