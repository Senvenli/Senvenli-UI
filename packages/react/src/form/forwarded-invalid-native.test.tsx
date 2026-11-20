import * as React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { Field, TextField } from "./index";
import { ComboBox, MultiSelect, Select } from "../selection/index";

// A form row's forwarded `aria-invalid` (the DS Field hands it to its control) marks the control for
// assistive tech and draws it invalid; it never becomes the control's native validity. Before, it went into React
// Aria's `isInvalid`, which under `validationBehavior="native"` (React Aria's default outside a DS Form) set the
// custom validity "Invalid value." on the input or the hidden <select>, and a form without `noValidate` silently
// refused every submit (after a refused add, Add and Enter did nothing).

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

type Extra = { id?: string; isInvalid?: boolean; errorMessage?: React.ReactNode; "aria-invalid"?: boolean | "true" };
type Control = {
  name: string;
  /** The element that carries the control's own aria-invalid and aria-describedby. */
  control: () => HTMLElement;
  /** Its focus target for Enter: the control itself when it is a text input, else the form's other text input. */
  enterTarget: () => HTMLElement;
  /** Whether React Aria puts aria-invalid on the control (a Select's trigger is a button: it does not). */
  ariaInvalidOnControl: boolean;
  root: string;
  frame?: string;
  make: (extra: Extra) => React.ReactElement;
};

const textbox = () => screen.getByRole("textbox", { name: "Row" });
const combobox = () => screen.getByRole("combobox", { name: "Row" });
const other = () => screen.getByRole("textbox", { name: "Note" });

const CONTROLS: Control[] = [
  {
    name: "TextField (validationBehavior native)",
    control: textbox,
    enterTarget: textbox,
    ariaInvalidOnControl: true,
    root: "text-field",
    frame: "input-group",
    make: (extra) => <TextField label="Row" name="code" validationBehavior="native" {...extra} />,
  },
  {
    name: "TextField (default)",
    control: textbox,
    enterTarget: textbox,
    ariaInvalidOnControl: true,
    root: "text-field",
    frame: "input-group",
    make: (extra) => <TextField label="Row" name="code" {...extra} />,
  },
  {
    name: "Select",
    control: () => document.querySelector<HTMLElement>("[data-slot='select-trigger']")!,
    enterTarget: other,
    ariaInvalidOnControl: false,
    root: "select",
    make: (extra) => <Select aria-label="Row" name="country" items={COUNTRIES} {...extra} />,
  },
  {
    name: "MultiSelect",
    control: () => document.querySelector<HTMLElement>("[data-slot='multi-select-trigger']")!,
    enterTarget: other,
    ariaInvalidOnControl: false,
    // Its frame is drawn from the root's data-invalid (group-data-[invalid]), as before.
    root: "multi-select",
    make: (extra) => <MultiSelect aria-label="Row" name="countries" items={COUNTRIES} {...extra} />,
  },
  {
    name: "ComboBox",
    control: combobox,
    enterTarget: combobox,
    ariaInvalidOnControl: true,
    root: "combobox",
    frame: "combobox-field",
    make: (extra) => <ComboBox aria-label="Row" name="country" items={COUNTRIES} {...extra} />,
  },
  {
    name: "ComboBox (multiple)",
    control: combobox,
    enterTarget: combobox,
    ariaInvalidOnControl: true,
    root: "combobox",
    frame: "combobox-field",
    make: (extra) => <ComboBox selectionMode="multiple" aria-label="Row" name="countries" items={COUNTRIES} {...extra} />,
  },
];

/** A plain form WITHOUT noValidate, as an app-validated form is: the DS Field owns the row's error text. */
function renderForm(control: Control, { error, extra = {} }: { error?: string; extra?: Extra } = {}) {
  const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
  const view = render(
    <DesignSystemProvider locale="en" navigate={vi.fn()}>
      <form onSubmit={onSubmit}>
        <Field htmlFor="row" error={error}>
          {control.make({ id: "row", ...extra })}
        </Field>
        <input aria-label="Note" name="note" />
        <button type="submit">Add</button>
      </form>
    </DesignSystemProvider>,
  );
  const form = view.container.querySelector("form")!;
  return { ...view, form, onSubmit };
}

const ids = (element: Element, attribute: string) => (element.getAttribute(attribute) ?? "").split(" ").filter(Boolean);
const invalidElements = (form: HTMLFormElement) =>
  [...form.elements].filter((element) => (element as HTMLInputElement).validity?.valid === false).map((element) => `${element.tagName}: ${(element as HTMLInputElement).validationMessage}`);

/** A click on the submit button: the browser validates (unless noValidate) and then submits. */
async function clickSubmit(form: HTMLFormElement) {
  await act(async () => fireEvent.click(form.querySelector("button[type='submit']")!));
}

/**
 * Enter in a text input: the browser's implicit submission presses the form's default button, unless the key was
 * handled (jsdom has no implicit submission, so it is done here as the browser does it).
 */
async function pressEnter(form: HTMLFormElement, target: HTMLElement) {
  await act(async () => target.focus());
  await act(async () => {
    const notHandled = fireEvent.keyDown(target, { key: "Enter", code: "Enter" });
    fireEvent.keyUp(target, { key: "Enter", code: "Enter" });
    if (notHandled) form.requestSubmit(form.querySelector<HTMLButtonElement>("button[type='submit']"));
  });
}

describe("a forwarded aria-invalid never sets native validity", () => {
  describe.each(CONTROLS.map((control) => [control.name, control] as const))("%s in a Field with an error", (_, control) => {
    it("leaves every form control natively valid, so checkValidity passes", () => {
      const { form } = renderForm(control, { error: "This country is already added." });
      expect(invalidElements(form)).toEqual([]);
      for (const element of form.elements) expect((element as HTMLInputElement).validationMessage ?? "").toBe("");
      expect(form.checkValidity()).toBe(true);
    });

    it("a submit button click reaches onSubmit", async () => {
      const { form, onSubmit } = renderForm(control, { error: "This country is already added." });
      await clickSubmit(form);
      expect(onSubmit).toHaveBeenCalledTimes(1);
      await act(async () => form.requestSubmit());
      expect(onSubmit).toHaveBeenCalledTimes(2);
    });

    it("Enter reaches onSubmit", async () => {
      const { form, onSubmit } = renderForm(control, { error: "This country is already added." });
      await pressEnter(form, control.enterTarget());
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it("still marks the control for assistive tech and draws it invalid, described by the Field's error", () => {
      renderForm(control, { error: "This country is already added." });
      const element = control.control();
      if (control.ariaInvalidOnControl) {
        expect(element.getAttribute("aria-invalid")).toBe("true");
        expect(element.hasAttribute("data-invalid")).toBe(true);
      } else {
        // As before: React Aria sets no aria-invalid on a button; the field shows data-invalid.
        expect(element.hasAttribute("aria-invalid")).toBe(false);
      }
      expect(document.querySelector(`[data-slot='${control.root}']`)!.getAttribute("data-invalid")).toBe("true");
      if (control.frame) expect(document.querySelector(`[data-slot='${control.frame}']`)!.hasAttribute("data-invalid")).toBe(true);
      // The Field's error describes the control; no second row of the control's own.
      const errorRow = screen.getByText("This country is already added.");
      expect(ids(element, "aria-describedby")).toContain(errorRow.id);
      expect(document.querySelector("[data-slot='field-error']")).toBeNull();
    });

    it("with no forwarded invalid nothing changes: valid, submits, no invalid marks", async () => {
      const { form, onSubmit } = renderForm(control);
      expect(invalidElements(form)).toEqual([]);
      expect(control.control().hasAttribute("aria-invalid")).toBe(false);
      expect(document.querySelector("[data-invalid]")).toBeNull();
      await clickSubmit(form);
      await pressEnter(form, control.enterTarget());
      expect(onSubmit).toHaveBeenCalledTimes(2);
    });

    it("the control's own errorMessage shows with the forwarded invalid, linked as before", () => {
      renderForm(control, { extra: { "aria-invalid": true, errorMessage: "Own error" } });
      const row = document.querySelector("[data-slot='field-error']")!;
      expect(row.textContent).toBe("Own error");
      expect(ids(control.control(), "aria-describedby")).toContain(row.id);
      expect(invalidElements(row.closest("form")!)).toEqual([]);
    });
  });

  it("an app flow: a refused add sets the row's error, and Add and Enter still submit", async () => {
    function Countries({ onAdd }: { onAdd: () => void }) {
      const [error, setError] = React.useState<string | undefined>();
      return (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onAdd();
            setError("This country is already added.");
          }}
        >
          <Field label="Shipping country" htmlFor="countryCode" error={error}>
            <ComboBox id="countryCode" name="countryCode" items={COUNTRIES} defaultSelectedKey="FR" />
          </Field>
          <button type="submit">Add</button>
        </form>
      );
    }
    const onAdd = vi.fn();
    const { container } = render(
      <DesignSystemProvider locale="en" navigate={vi.fn()}>
        <Countries onAdd={onAdd} />
      </DesignSystemProvider>,
    );
    const form = container.querySelector("form")!;
    await clickSubmit(form);
    expect(onAdd).toHaveBeenCalledTimes(1);
    const input = screen.getByRole("combobox", { name: "Shipping country" }) as HTMLInputElement;
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.validity.valid).toBe(true);
    await clickSubmit(form);
    expect(onAdd).toHaveBeenCalledTimes(2);
    await pressEnter(form, input);
    expect(onAdd).toHaveBeenCalledTimes(3);
  });

  it("aria-invalid=\"true\" (a string) is honoured the same way", () => {
    const { form } = renderForm(CONTROLS[4], { extra: { "aria-invalid": "true" } });
    expect(combobox().getAttribute("aria-invalid")).toBe("true");
    expect(form.checkValidity()).toBe(true);
  });

  it.each(CONTROLS.map((control) => [control.name, control] as const))(
    "%s: the row's error coming and going keeps the control's own error row linked, with no dangling id",
    async (_, control) => {
      const ui = (invalid: boolean) => (
        <DesignSystemProvider locale="en" navigate={vi.fn()}>
          {control.make({ errorMessage: "Own error", ...(invalid ? { "aria-invalid": true } : null) })}
          <input aria-label="Note" />
        </DesignSystemProvider>
      );
      const { rerender } = render(ui(false));
      const describedIds = () => ids(control.control(), "aria-describedby");
      expect(document.querySelector("[data-slot='field-error']")).toBeNull();
      for (const id of describedIds()) expect(document.getElementById(id)).not.toBeNull();
      await act(async () => rerender(ui(true)));
      const row = document.querySelector("[data-slot='field-error']")!;
      expect(row.textContent).toBe("Own error");
      expect(describedIds()).toContain(row.id);
      expect(document.querySelector(`[data-slot='${control.root}']`)!.getAttribute("data-invalid")).toBe("true");
      await act(async () => rerender(ui(false)));
      expect(document.querySelector("[data-slot='field-error']")).toBeNull();
      expect(document.querySelector("[data-invalid]")).toBeNull();
      for (const id of describedIds()) expect(document.getElementById(id)).not.toBeNull();
    },
  );
});

describe("unchanged: an explicit isInvalid and the field's own validation", () => {
  it("an explicit isInvalid under native validation is still the control's native validity, as React Aria defines", () => {
    for (const control of [CONTROLS[0], CONTROLS[2], CONTROLS[3], CONTROLS[4], CONTROLS[5]]) {
      const { form, unmount } = renderForm(control, { extra: { isInvalid: true } });
      expect(invalidElements(form)).toHaveLength(1);
      expect(invalidElements(form)[0]).toMatch(/Invalid value\.$/);
      expect(form.checkValidity()).toBe(false);
      expect(document.querySelector(`[data-slot='${control.root}']`)!.getAttribute("data-invalid")).toBe("true");
      unmount();
    }
  });

  it("an explicit isInvalid with the default (aria) TextField behaviour sets no native validity, as before", () => {
    const { form } = renderForm(CONTROLS[1], { extra: { isInvalid: true } });
    expect(textbox().getAttribute("aria-invalid")).toBe("true");
    expect(form.checkValidity()).toBe(true);
  });

  it("an explicit isInvalid and a forwarded invalid together: the explicit one still decides native validity", () => {
    const { form } = renderForm(CONTROLS[4], { error: "Row error", extra: { isInvalid: true } });
    expect((combobox() as HTMLInputElement).validationMessage).toBe("Invalid value.");
    expect(form.checkValidity()).toBe(false);
  });

  it("the field's own native required check still works under a forwarded invalid (valueMissing, not a custom error)", async () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    const { container } = render(
      <DesignSystemProvider locale="en" navigate={vi.fn()}>
        <form onSubmit={onSubmit}>
          <Field htmlFor="row" error="Row error">
            <TextField id="row" label="Row" validationBehavior="native" isRequired />
          </Field>
          <button type="submit">Add</button>
        </form>
      </DesignSystemProvider>,
    );
    const input = textbox() as HTMLInputElement;
    expect(input.validity.valueMissing).toBe(true);
    expect(input.validity.customError).toBe(false);
    await clickSubmit(container.querySelector("form")!);
    expect(onSubmit).not.toHaveBeenCalled();
    await act(async () => fireEvent.change(input, { target: { value: "AB-1234" } }));
    expect(input.validity.valid).toBe(true);
    await clickSubmit(container.querySelector("form")!);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
