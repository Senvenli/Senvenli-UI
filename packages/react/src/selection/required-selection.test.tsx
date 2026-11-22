import * as React from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Form, TextField } from "../form/index";
import { DesignSystemProvider } from "../provider";
import { Autocomplete, Checkbox, CheckboxGroup, ComboBox, MultiSelect, RadioGroup, Select } from "./index";

// A required Select, ComboBox or MultiSelect (and Autocomplete, RadioGroup (cards too), Checkbox,
// CheckboxGroup) left empty must block a DS Form submit under `aria` validation (the
// default), show the required message and be marked invalid. React Aria's `aria` behaviour has no
// required check and never validates an empty selection; the DS's own check (useFieldValidation) covers
// these fields like TextField, `requiredValidation="app"` included.

afterEach(cleanup);

// jsdom has no CSS.escape; React Aria uses it to find the selected option when a listbox opens.
if (typeof globalThis.CSS === "undefined" || typeof globalThis.CSS.escape !== "function") {
  Object.assign(globalThis, { CSS: { ...(globalThis.CSS ?? {}), escape: (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`) } });
}

const REQUIRED = "Fill in this field.";
const TEAMS = [
  { id: "des", label: "Design" },
  { id: "eng", label: "Engineering" },
  { id: "sal", label: "Sales" },
];

function inLocale(ui: React.ReactElement) {
  return render(<DesignSystemProvider locale="en" navigate={vi.fn()}>{ui}</DesignSystemProvider>);
}

/** A real mouse press: React Aria opens on pointer events. */
function press(element: Element) {
  const pointer = { pointerType: "mouse", pointerId: 1, detail: 1, buttons: 1, width: 1, height: 1 };
  fireEvent.pointerDown(element, pointer);
  fireEvent.mouseDown(element, { detail: 1, buttons: 1 });
  fireEvent.pointerUp(element, { ...pointer, buttons: 0 });
  fireEvent.mouseUp(element, { detail: 1 });
  fireEvent.click(element, { detail: 1 });
}

// By selector: an open popover hides the rest of the page from the accessibility tree.
const submitButton = () => document.querySelector<HTMLButtonElement>("button[type='submit']")!;
const submit = () => fireEvent.click(submitButton());
const errorRow = (root: HTMLElement) => root.querySelector<HTMLElement>("[data-slot='field-error']");
const ids = (element: Element, attribute: string) => (element.getAttribute(attribute) ?? "").split(" ").filter(Boolean);

function inForm(field: React.ReactElement, props: Partial<React.ComponentProps<typeof Form>> = {}) {
  const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
  const view = inLocale(
    <Form onSubmit={onSubmit} {...props}>
      {field}
      <button type="submit">Submit</button>
    </Form>,
  );
  return { ...view, onSubmit };
}

/** Each of the four, with how to reach its control, what the form focuses and how a user picks a value. */
type Kind = {
  name: string;
  slot: string;
  render: (props: Record<string, unknown>) => React.ReactElement;
  /** The element the DS Form focuses for this field and that a keyboard user leaves. */
  focusTarget: (root: HTMLElement) => HTMLElement;
  pick: (root: HTMLElement) => void;
  /** Where React Aria puts the invalid mark a screen reader hears, when there is one besides the root's `data-invalid`. */
  ariaInvalid?: (root: HTMLElement) => HTMLElement;
};

function pickFromListbox(trigger: HTMLElement, name: RegExp) {
  press(trigger);
  press(within(screen.getByRole("listbox")).getByRole("option", { name }));
}

function typeAndPick(input: HTMLElement, text: string) {
  act(() => input.focus());
  fireEvent.change(input, { target: { value: text } });
  fireEvent.keyDown(input, { key: "ArrowDown" });
  fireEvent.keyDown(input, { key: "Enter" });
}

const KINDS: Kind[] = [
  {
    name: "Select",
    slot: "select",
    render: (p) => <Select label="Team" items={TEAMS} isRequired name="team" {...p} />,
    focusTarget: (root) => root.querySelector<HTMLElement>("[data-slot='select-trigger']")!,
    pick: (root) => pickFromListbox(root.querySelector<HTMLElement>("[data-slot='select-trigger']")!, /Engineering/),
  },
  {
    name: "MultiSelect",
    slot: "multi-select",
    render: (p) => <MultiSelect label="Teams" items={TEAMS} isRequired name="teams" {...p} />,
    focusTarget: (root) => root.querySelector<HTMLElement>("[data-slot='multi-select-trigger']")!,
    pick: (root) => pickFromListbox(root.querySelector<HTMLElement>("[data-slot='multi-select-trigger']")!, /Engineering/),
  },
  {
    name: "ComboBox",
    slot: "combobox",
    render: (p) => <ComboBox label="Department" items={TEAMS} isRequired name="department" {...p} />,
    focusTarget: () => screen.getByRole("combobox"),
    pick: () => typeAndPick(screen.getByRole("combobox"), "eng"),
    ariaInvalid: () => screen.getByRole("combobox"),
  },
  {
    name: "ComboBox (multiple)",
    slot: "combobox",
    render: (p) => <ComboBox selectionMode="multiple" label="Departments" items={TEAMS} isRequired name="departments" {...p} />,
    focusTarget: () => screen.getByRole("combobox"),
    pick: () => typeAndPick(screen.getByRole("combobox"), "eng"),
    ariaInvalid: () => screen.getByRole("combobox"),
  },
];

function Controlled({ kind }: { kind: Kind }) {
  const [single, setSingle] = React.useState<React.Key | null>(null);
  const [many, setMany] = React.useState<React.Key[]>([]);
  if (kind.name === "Select") return kind.render({ selectedKey: single, onSelectionChange: setSingle });
  if (kind.name === "ComboBox") return kind.render({ selectedKey: single, onSelectionChange: setSingle });
  return kind.render({ selectedKeys: many, onSelectionChange: setMany });
}

for (const kind of KINDS) {
  describe(`${kind.name}: required in a DS Form`, () => {
    it("blocks submit when empty, shows the required message, marks the field invalid and focuses it", () => {
      const { container, onSubmit } = inForm(kind.render({}));
      expect(errorRow(container)).toBeNull();
      submit();
      expect(onSubmit).not.toHaveBeenCalled();
      const root = container.querySelector<HTMLElement>(`[data-slot='${kind.slot}']`)!;
      expect(root.hasAttribute("data-invalid")).toBe(true);
      const row = errorRow(container)!;
      expect(row.textContent).toBe(REQUIRED);
      const target = kind.focusTarget(container);
      expect(document.activeElement).toBe(target);
      if (kind.ariaInvalid) {
        const control = kind.ariaInvalid(container);
        expect(control.getAttribute("aria-invalid")).toBe("true");
        expect(ids(control, "aria-describedby")).toContain(row.id);
      }
    });

    for (const mode of ["uncontrolled", "controlled"] as const) {
      it(`a value picked after the error clears it, and the next submit goes through (${mode})`, () => {
        const { container, onSubmit } = inForm(mode === "controlled" ? <Controlled kind={kind} /> : kind.render({}));
        submit();
        expect(errorRow(container)?.textContent).toBe(REQUIRED);
        kind.pick(container);
        expect(container.textContent).not.toContain(REQUIRED);
        expect(container.querySelector(`[data-slot='${kind.slot}']`)!.hasAttribute("data-invalid")).toBe(false);
        submit();
        expect(onSubmit).toHaveBeenCalledTimes(1);
      });
    }

    it("focuses the first invalid field in document order across DS fields", () => {
      const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
      const { container } = inLocale(
        <Form onSubmit={onSubmit}>
          <TextField label="Note" />
          {kind.render({})}
          <TextField label="Surname" isRequired />
          <button type="submit">Submit</button>
        </Form>,
      );
      submit();
      expect(onSubmit).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(kind.focusTarget(container));
      expect(screen.getAllByText(REQUIRED)).toHaveLength(2);
      cleanup();

      // A required TextField before it is the first invalid one.
      const second = inLocale(
        <Form onSubmit={onSubmit}>
          <TextField label="Name" isRequired />
          {kind.render({})}
          <button type="submit">Submit</button>
        </Form>,
      );
      submit();
      expect(document.activeElement).toBe(second.container.querySelector("[data-slot='text-field-input']"));
    });

    it("shows the message on a blur that leaves it empty, not before (the Form README timing)", () => {
      const { container } = inForm(kind.render({}));
      const target = kind.focusTarget(container);
      act(() => target.focus());
      expect(container.textContent).not.toContain(REQUIRED);
      act(() => target.blur());
      expect(errorRow(container)?.textContent).toBe(REQUIRED);
    });

    it('requiredValidation="app": marked required, but submit reaches the app with no DS message or invalid mark', () => {
      const { container, onSubmit } = inForm(kind.render({ requiredValidation: "app" }));
      expect(container.querySelector("[data-slot='field-required']")?.textContent).toBe("*");
      const target = kind.focusTarget(container);
      act(() => target.focus());
      act(() => target.blur());
      submit();
      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(container.textContent).not.toContain(REQUIRED);
      expect(container.querySelector("[data-invalid]")).toBeNull();
      expect(container.querySelector("[aria-invalid='true']")).toBeNull();
    });

    it('requiredValidation="app": the app\'s own error (isInvalid + errorMessage) shows and blocks until it clears', () => {
      const { container, onSubmit } = inForm(kind.render({ requiredValidation: "app", isInvalid: true, errorMessage: "Select a team." }));
      submit();
      expect(onSubmit).not.toHaveBeenCalled();
      expect(errorRow(container)?.textContent).toBe("Select a team.");
      expect(container.textContent).not.toContain(REQUIRED);
    });

    it("native validation: the DS adds no message of its own (the browser owns required)", () => {
      const { container } = inForm(kind.render({}), { validationBehavior: "native" });
      const target = kind.focusTarget(container);
      act(() => target.focus());
      act(() => target.blur());
      expect(container.textContent).not.toContain(REQUIRED);
      expect(container.querySelector("[data-invalid]")).toBeNull();
    });

    it("a server error for its name still shows on a filled field and clears when the value changes", () => {
      const preset = kind.name.includes("multiple") || kind.name === "MultiSelect" ? { defaultSelectedKeys: ["des"] } : { defaultSelectedKey: "des" };
      const name = kind.name === "Select" ? "team" : kind.name === "MultiSelect" ? "teams" : kind.name === "ComboBox" ? "department" : "departments";
      const { container, onSubmit } = inForm(kind.render(preset), { validationErrors: { [name]: "This team is archived." } });
      expect(errorRow(container)?.textContent).toBe("This team is archived.");
      submit();
      expect(onSubmit).not.toHaveBeenCalled();
      kind.pick(container);
      expect(container.textContent).not.toContain("This team is archived.");
      expect(container.textContent).not.toContain(REQUIRED);
    });

    it("a form reset hides the required message again", () => {
      const { container } = inForm(kind.render({}));
      submit();
      expect(errorRow(container)?.textContent).toBe(REQUIRED);
      act(() => container.querySelector("form")!.reset());
      expect(container.textContent).not.toContain(REQUIRED);
      expect(container.querySelector(`[data-slot='${kind.slot}']`)!.hasAttribute("data-invalid")).toBe(false);
    });
  });
}

describe("ComboBox allowsCustomValue: typed text is the value", () => {
  it("empty blocks; typed custom text clears the message and submits", () => {
    const { container, onSubmit } = inForm(<ComboBox label="Department" items={TEAMS} isRequired name="department" allowsCustomValue />);
    submit();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(errorRow(container)?.textContent).toBe(REQUIRED);
    const input = screen.getByRole("combobox");
    act(() => input.focus());
    fireEvent.change(input, { target: { value: "Research" } });
    expect(container.textContent).not.toContain(REQUIRED);
    submit();
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("without allowsCustomValue, text that names no item is not a value", () => {
    const { container, onSubmit } = inForm(<ComboBox label="Department" items={TEAMS} isRequired name="department" />);
    const input = screen.getByRole("combobox");
    act(() => input.focus());
    fireEvent.change(input, { target: { value: "Research" } });
    submit();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(errorRow(container)?.textContent).toBe(REQUIRED);
  });
});

/** The other DS fields with the same gap: empty and required blocks a DS Form; `app` lets it through. */
const OTHERS: { name: string; render: (props: Record<string, unknown>) => React.ReactElement; fill: (root: HTMLElement) => void }[] = [
  {
    name: "Autocomplete",
    render: (p) => {
      function Field() {
        const [value, setValue] = React.useState("");
        return <Autocomplete label="Address" value={value} onChange={setValue} isRequired getSuggestions={async () => []} {...p} />;
      }
      return <Field />;
    },
    fill: () => {
      const input = screen.getByRole("combobox");
      act(() => input.focus());
      fireEvent.change(input, { target: { value: "12 Main Street" } });
    },
  },
  {
    name: "RadioGroup",
    render: (p) => <RadioGroup label="Contact" isRequired items={[{ value: "email", label: "Email" }, { value: "phone", label: "Phone" }]} {...p} />,
    fill: () => fireEvent.click(screen.getByRole("radio", { name: "Phone" })),
  },
  {
    name: "RadioGroup variant=card",
    render: (p) => <RadioGroup label="Plan" variant="card" isRequired items={[{ value: "basic", label: "Basic" }, { value: "full", label: "Full" }]} {...p} />,
    fill: () => fireEvent.click(screen.getByRole("radio", { name: "Full" })),
  },
  {
    name: "Checkbox",
    render: (p) => <Checkbox isRequired errorMessage={undefined} {...p}>I accept the terms</Checkbox>,
    fill: () => fireEvent.click(screen.getByRole("checkbox")),
  },
  {
    name: "CheckboxGroup",
    render: (p) => (
      <CheckboxGroup label="Notifications" isRequired {...p}>
        <Checkbox value="email">Email</Checkbox>
        <Checkbox value="push">Push</Checkbox>
      </CheckboxGroup>
    ),
    fill: () => fireEvent.click(screen.getByRole("checkbox", { name: "Push" })),
  },
];

describe("the other DS fields with the same gap", () => {
  for (const field of OTHERS) {
    it(`${field.name}: empty and required blocks a DS Form submit with the message and an invalid mark; a value clears it`, () => {
      const { container, onSubmit } = inForm(field.render({}));
      submit();
      expect(onSubmit).not.toHaveBeenCalled();
      expect(container.textContent).toContain(REQUIRED);
      expect(container.querySelector("[data-invalid], [aria-invalid='true']")).not.toBeNull();
      expect(container.contains(document.activeElement) && document.activeElement !== submitButton()).toBe(true);
      field.fill(container);
      expect(container.textContent).not.toContain(REQUIRED);
      submit();
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it(`${field.name}: requiredValidation="app" leaves the empty value to the app`, () => {
      const { container, onSubmit } = inForm(field.render({ requiredValidation: "app" }));
      submit();
      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(container.textContent).not.toContain(REQUIRED);
      expect(container.querySelector("[data-invalid], [aria-invalid='true']")).toBeNull();
    });
  }

  it("a Checkbox inside a CheckboxGroup leaves required to the group", () => {
    const { onSubmit } = inForm(
      <CheckboxGroup label="Notifications">
        <Checkbox value="email" isRequired>Email</Checkbox>
      </CheckboxGroup>,
    );
    submit();
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("outside a DS Form nothing changes for a field left alone", () => {
    const { container } = inLocale(<Select label="Team" items={TEAMS} isRequired />);
    expect(container.textContent).not.toContain(REQUIRED);
    expect(container.querySelector("[data-invalid]")).toBeNull();
  });
});

// The app's own isInvalid owns the field, as on TextField.
const APP_MESSAGE = "The app's message.";
/** The field's error row: FieldError's, or a lone Checkbox's own (choice-text.tsx). */
const messageRow = (root: HTMLElement) => root.querySelector<HTMLElement>("[data-slot='field-error'], [data-slot='choice-error']");

/** Every field with the DS required check, plus TextField (whose behaviour is the reference and must not change). */
const ALL: { name: string; render: (props: Record<string, unknown>) => React.ReactElement }[] = [
  ...KINDS.map((kind) => ({ name: kind.name, render: kind.render })),
  ...OTHERS.map((field) => ({ name: field.name, render: field.render })),
  { name: "TextField", render: (p) => <TextField label="Name" isRequired name="name" {...p} /> },
];

describe("the app's isInvalid wins over the DS required check, as on TextField", () => {
  for (const field of ALL) {
    it(`${field.name}: isInvalid + errorMessage shows only the app's message, on blur and on submit, and blocks`, () => {
      const { container, onSubmit } = inForm(field.render({ isInvalid: true, errorMessage: APP_MESSAGE }));
      const control = container.querySelector<HTMLElement>("input:not([type='hidden']), button[aria-haspopup]");
      if (control) {
        act(() => control.focus());
        act(() => control.blur());
      }
      expect(messageRow(container)?.textContent).toBe(APP_MESSAGE);
      submit();
      expect(onSubmit).not.toHaveBeenCalled();
      expect(messageRow(container)?.textContent).toBe(APP_MESSAGE);
      expect(container.textContent).not.toContain(REQUIRED);
    });

    it(`${field.name}: isInvalid={false} overrides the required check; an empty field submits with no message`, () => {
      const { container, onSubmit } = inForm(field.render({ isInvalid: false }));
      submit();
      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(container.textContent).not.toContain(REQUIRED);
      expect(container.querySelector("[data-invalid], [aria-invalid='true']")).toBeNull();
    });

    it(`${field.name}: disabled, empty and required, it blocks a DS Form submit and takes no focus`, () => {
      const { container, onSubmit } = inForm(field.render({ isDisabled: true }));
      submit();
      expect(onSubmit).not.toHaveBeenCalled();
      expect(container.querySelector("[data-invalid], [aria-invalid='true']")).not.toBeNull();
      expect(container.contains(document.activeElement) && document.activeElement !== submitButton()).toBe(false);
    });
  }

  it("TextField: without isInvalid an empty required field still blocks with the DS message (unchanged)", () => {
    const { container, onSubmit } = inForm(<TextField label="Name" isRequired />);
    submit();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(errorRow(container)?.textContent).toBe(REQUIRED);
  });
});

// A lone Checkbox's choice-error live region stays mounted, empty, while the box is valid under the DS required
// check, so the required message arrives in a region that was already there and is announced as it appears.
describe("lone Checkbox: the required message appears inside the same live region", () => {
  const box = () => screen.getByRole("checkbox");
  const region = () => document.querySelector<HTMLElement>("[data-slot='choice-error']");
  const blur = () => {
    act(() => box().focus());
    act(() => box().blur());
  };

  it("valid → required error → valid on blur, check, uncheck and blur again: one node, empty while valid", () => {
    inForm(<Checkbox isRequired>I accept the terms</Checkbox>);
    const node = region();
    expect(node).not.toBeNull();
    expect(node!.getAttribute("aria-live")).toBe("polite");
    expect(node!.childElementCount).toBe(0);
    expect(node!.textContent).toBe("");
    const { id } = node!;
    expect(ids(box(), "aria-describedby")[0]).toBe(id);
    const steps: [string, () => void, string][] = [
      ["blur, unchecked", blur, REQUIRED],
      ["check", () => fireEvent.click(box()), ""],
      ["uncheck", () => fireEvent.click(box()), ""],
      ["blur, unchecked again", blur, REQUIRED],
      ["check again", () => fireEvent.click(box()), ""],
    ];
    for (const [step, run, text] of steps) {
      run();
      expect(region(), step).toBe(node);
      expect(node!.id, step).toBe(id);
      expect(node!.textContent, step).toBe(text);
      expect(node!.querySelector("[data-slot='field-error']") !== null, step).toBe(text !== "");
      expect(box().getAttribute("aria-invalid") === "true", step).toBe(text !== "");
    }
  });

  it("from a submit on: the message appears in the region that was already there, and leaves it empty on check", () => {
    const { onSubmit } = inForm(<Checkbox isRequired>I accept the terms</Checkbox>);
    const node = region();
    expect(node?.textContent).toBe("");
    submit();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(region()).toBe(node);
    expect(node!.textContent).toBe(REQUIRED);
    fireEvent.click(box());
    expect(region()).toBe(node);
    expect(node!.textContent).toBe("");
  });

  it("no region where the DS required message cannot appear (unchanged)", () => {
    const cases: [string, React.ReactElement][] = [
      ["not required", <Form key="a"><Checkbox>Terms</Checkbox></Form>],
      ["requiredValidation app", <Form key="b"><Checkbox isRequired requiredValidation="app">Terms</Checkbox></Form>],
      ["app owns isInvalid={false}", <Form key="c"><Checkbox isRequired isInvalid={false}>Terms</Checkbox></Form>],
      ["native validation", <Form key="d" validationBehavior="native"><Checkbox isRequired>Terms</Checkbox></Form>],
      ["outside any form", <Checkbox key="e" isRequired>Terms</Checkbox>],
    ];
    for (const [name, ui] of cases) {
      const { unmount } = inLocale(ui);
      expect(region(), name).toBeNull();
      expect(box().hasAttribute("aria-describedby"), name).toBe(false);
      unmount();
    }
  });
});
