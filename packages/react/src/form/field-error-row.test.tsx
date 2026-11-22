import * as React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { Field, Form } from "./index";
import { TextField } from "./text-field";
import { ComboBox, MultiSelect, Select } from "../selection/index";

// (1) A control's own error row is linked through aria-describedby whenever it shows, also when it comes or goes
// while a forwarded aria-invalid stays on; (2) a DS Form blocks submit for an invalid Select or MultiSelect too, and
// focuses its trigger.

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

const COUNTRIES = [
  { id: "DE", label: "Germany" },
  { id: "FR", label: "France" },
];

type Extra = { errorMessage?: React.ReactNode; "aria-invalid"?: boolean };
const CONTROLS: { name: string; control: () => HTMLElement; make: (extra: Extra) => React.ReactElement }[] = [
  { name: "TextField", control: () => screen.getByRole("textbox"), make: (extra) => <TextField label="Row" {...extra} /> },
  { name: "Select", control: () => document.querySelector<HTMLElement>("[data-slot='select-trigger']")!, make: (extra) => <Select label="Row" items={COUNTRIES} {...extra} /> },
  {
    name: "MultiSelect",
    control: () => document.querySelector<HTMLElement>("[data-slot='multi-select-trigger']")!,
    make: (extra) => <MultiSelect label="Row" items={COUNTRIES} {...extra} />,
  },
  { name: "ComboBox", control: () => screen.getByRole("combobox"), make: (extra) => <ComboBox label="Row" items={COUNTRIES} {...extra} /> },
  {
    name: "ComboBox (multiple)",
    control: () => screen.getByRole("combobox"),
    make: (extra) => <ComboBox selectionMode="multiple" label="Row" items={COUNTRIES} {...extra} />,
  },
];

const wrap = (ui: React.ReactElement) => <DesignSystemProvider locale="en" navigate={vi.fn()}>{ui}</DesignSystemProvider>;

/** The texts the control is described by; an id that names nothing shows as "#id?". */
function described(element: HTMLElement) {
  return (element.getAttribute("aria-describedby") ?? "")
    .split(" ")
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent ?? `#${id}?`);
}
const errorRow = () => document.querySelector("[data-slot='field-error']");

describe.each(CONTROLS)("$name: its own error row is linked whenever it shows", (entry) => {
  it("a message that comes and goes while the forwarded aria-invalid stays on", async () => {
    const view = render(wrap(entry.make({ "aria-invalid": true })));
    expect(errorRow()).toBeNull();
    await act(async () => view.rerender(wrap(entry.make({ "aria-invalid": true, errorMessage: "Select a country." }))));
    expect(errorRow()?.textContent).toBe("Select a country.");
    expect(described(entry.control())).toContain("Select a country.");
    await act(async () => view.rerender(wrap(entry.make({ "aria-invalid": true }))));
    expect(errorRow()).toBeNull();
    expect(described(entry.control()).filter((text) => text.startsWith("#"))).toEqual([]);
  });

  it("the forwarded aria-invalid that comes and goes while a message stays", async () => {
    const view = render(wrap(entry.make({ errorMessage: "Select a country." })));
    expect(errorRow()).toBeNull();
    await act(async () => view.rerender(wrap(entry.make({ "aria-invalid": true, errorMessage: "Select a country." }))));
    expect(described(entry.control())).toContain("Select a country.");
    await act(async () => view.rerender(wrap(entry.make({ errorMessage: "Select a country." }))));
    expect(errorRow()).toBeNull();
    expect(described(entry.control()).filter((text) => text.startsWith("#"))).toEqual([]);
    await act(async () => view.rerender(wrap(entry.make({ "aria-invalid": true, errorMessage: "Select a country." }))));
    expect(described(entry.control())).toContain("Select a country.");
  });
});

describe("DS Form: an invalid Select or MultiSelect blocks submit and takes focus at its trigger", () => {
  function inForm(ui: React.ReactElement) {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    render(
      wrap(
        <Form onSubmit={onSubmit}>
          {ui}
          <button type="submit">Save</button>
        </Form>,
      ),
    );
    return onSubmit;
  }
  const submit = () => fireEvent.click(screen.getByRole("button", { name: "Save" }));

  it("a Select inside a Field with an error", () => {
    const onSubmit = inForm(
      <Field label="Region" error="Select a region.">
        <Select aria-label="Region" items={COUNTRIES} />
      </Field>,
    );
    submit();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(document.querySelector("[data-slot='select-trigger']"));
  });

  it("a MultiSelect inside a Field with an error", () => {
    const onSubmit = inForm(
      <Field label="Countries" error="Select at least one country.">
        <MultiSelect aria-label="Countries" items={COUNTRIES} />
      </Field>,
    );
    submit();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(document.querySelector("[data-slot='multi-select-trigger']"));
  });

  it("a MultiSelect with chosen tags: the trigger, not a tag's remove button", () => {
    const onSubmit = inForm(
      <Field label="Countries" error="These countries cannot be selected together.">
        <MultiSelect aria-label="Countries" items={COUNTRIES} defaultSelectedKeys={["DE", "FR"]} />
      </Field>,
    );
    submit();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(document.querySelector("[data-slot='multi-select-trigger']"));
  });

  it("a Select invalid on its own (isInvalid) blocks too", () => {
    const onSubmit = inForm(<Select label="Region" items={COUNTRIES} isInvalid errorMessage="Select a region." />);
    submit();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(document.querySelector("[data-slot='select-trigger']"));
  });

  it("the first invalid field in the form's order takes focus; a text field's input as before", () => {
    const onSubmit = inForm(
      <>
        <Field label="Code row" error="A code is required.">
          <TextField label="Code" />
        </Field>
        <Field label="Region" error="Select a region.">
          <Select aria-label="Region" items={COUNTRIES} />
        </Field>
      </>,
    );
    submit();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Code" }));
  });

  it("valid Select and MultiSelect let the form submit", () => {
    const onSubmit = inForm(
      <>
        <Field label="Region">
          <Select aria-label="Region" items={COUNTRIES} defaultSelectedKey="DE" />
        </Field>
        <Field label="Countries">
          <MultiSelect aria-label="Countries" items={COUNTRIES} />
        </Field>
      </>,
    );
    submit();
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
