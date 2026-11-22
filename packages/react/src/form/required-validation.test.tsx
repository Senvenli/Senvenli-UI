import * as React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DateField, DatePicker, DateRangePicker, TimeField } from "../date/index";
import { DesignSystemProvider } from "../provider";
import { Form, OtpField, NumberField, PasswordField, TextArea, TextField } from "./index";

// requiredValidation: an app that validates on submit and shows its own error wants the required asterisk and
// aria-required without the built-in "Fill in this field." message on blur. `requiredValidation="app"` marks the
// field required and leaves the empty-value error to the app; the default (`field`) is unchanged.

afterEach(cleanup);

const REQUIRED = "Fill in this field.";

function inLocale(ui: React.ReactElement, locale = "en-GB", dir?: "rtl") {
  return render(
    <div dir={dir}>
      <DesignSystemProvider locale={locale} navigate={vi.fn()}>{ui}</DesignSystemProvider>
    </div>,
  );
}

const ssr = (ui: React.ReactElement, locale = "en-GB") =>
  renderToStaticMarkup(<DesignSystemProvider locale={locale} navigate={vi.fn()}>{ui}</DesignSystemProvider>);

const ids = (element: Element, attribute: string) => (element.getAttribute(attribute) ?? "").split(" ").filter(Boolean);
/** The accessible description as a screen reader builds it from aria-describedby (the referenced texts, in order). */
const description = (element: Element) =>
  ids(element, "aria-describedby").map((id) => document.getElementById(id)?.textContent?.trim() ?? "").filter(Boolean).join(" ");

type Mode = { requiredValidation?: "field" | "app" };
type Extra = { isInvalid?: boolean; errorMessage?: React.ReactNode };

/** Every DS field whose required check is the DS's own (useFieldValidation), and the control a keyboard lands on. */
const FIELDS: { name: string; render: (props: Mode & Extra) => React.ReactElement; control: (root: HTMLElement) => HTMLElement }[] = [
  { name: "TextField", render: (p) => <TextField label="Name" isRequired {...p} />, control: () => screen.getByRole("textbox") },
  {
    name: "PasswordField",
    render: (p) => <PasswordField label="Password" autoComplete="new-password" isRequired {...p} />,
    control: (root) => root.querySelector<HTMLElement>("[data-slot='password-field-input']")!,
  },
  { name: "TextArea", render: (p) => <TextArea label="Notes" isRequired {...p} />, control: () => screen.getByRole("textbox") },
  { name: "NumberField", render: (p) => <NumberField label="Amount" isRequired {...p} />, control: () => screen.getByRole("textbox") },
  { name: "OtpField", render: (p) => <OtpField label="Code" isRequired {...p} />, control: () => screen.getByRole("textbox") },
  { name: "DateField", render: (p) => <DateField label="Birth date" isRequired {...p} />, control: () => screen.getAllByRole("spinbutton")[0]! },
  { name: "TimeField", render: (p) => <TimeField label="Time" isRequired {...p} />, control: () => screen.getAllByRole("spinbutton")[0]! },
  { name: "DatePicker", render: (p) => <DatePicker label="Due date" isRequired {...p} />, control: () => screen.getAllByRole("spinbutton")[0]! },
  { name: "DateRangePicker", render: (p) => <DateRangePicker label="Period" isRequired {...p} />, control: () => screen.getAllByRole("spinbutton")[0]! },
];

/** Keyboard focus in, then out (Tab away), with nothing typed. */
async function visitAndLeave(control: HTMLElement) {
  await act(async () => control.focus());
  await act(async () => control.blur());
}

const shownError = (root: HTMLElement) => root.querySelector("[data-slot='field-error']");

describe("requiredValidation=\"app\": the marker without the built-in message", () => {
  for (const field of FIELDS) {
    it(`${field.name}: asterisk and aria-required; a blur on the empty field shows no message and no invalid state`, async () => {
      const { container } = inLocale(field.render({ requiredValidation: "app" }));
      const star = container.querySelector("[data-slot='field-required']")!;
      expect(star.textContent).toBe("*");
      expect(star.getAttribute("aria-hidden")).toBe("true");
      const control = field.control(container);
      expect(control.getAttribute("aria-required")).toBe("true");
      await visitAndLeave(control);
      expect(container.textContent).not.toContain(REQUIRED);
      expect(shownError(container)).toBeNull();
      expect(control.hasAttribute("aria-invalid")).toBe(false);
      expect(container.querySelector("[data-invalid]")).toBeNull();
      // Nothing to announce: the description holds no error.
      expect(description(control)).not.toContain(REQUIRED);
      // Still required to assistive technology after the blur.
      expect(control.getAttribute("aria-required")).toBe("true");
    });

    it(`${field.name}: an app error shows, is in the field's description and clears as today; still aria-required`, () => {
      const { container, rerender } = inLocale(field.render({ requiredValidation: "app", isInvalid: true, errorMessage: "Enter your password." }));
      const control = field.control(container);
      const row = shownError(container)!;
      expect(row.textContent).toBe("Enter your password.");
      expect(control.getAttribute("aria-invalid")).toBe("true");
      expect(description(control)).toContain("Enter your password.");
      expect(control.getAttribute("aria-required")).toBe("true");
      rerender(
        <div>
          <DesignSystemProvider locale="en-GB" navigate={vi.fn()}>{field.render({ requiredValidation: "app" })}</DesignSystemProvider>
        </div>,
      );
      expect(shownError(container)).toBeNull();
      expect(field.control(container).hasAttribute("aria-invalid")).toBe(false);
      expect(field.control(container).getAttribute("aria-required")).toBe("true");
    });

    it(`${field.name}: without the option (and with "field") a blur on the empty field shows the message as before`, async () => {
      for (const mode of [{}, { requiredValidation: "field" as const }]) {
        const { container, unmount } = inLocale(field.render(mode));
        const control = field.control(container);
        await visitAndLeave(control);
        expect(shownError(container)!.textContent).toBe(REQUIRED);
        expect(control.getAttribute("aria-invalid")).toBe("true");
        expect(description(control)).toContain(REQUIRED);
        unmount();
      }
    });

    it(`${field.name}: requiredValidation leaves the server render unchanged (marker identical to the default)`, () => {
      const plain = ssr(field.render({}));
      expect(ssr(field.render({ requiredValidation: "field" }))).toBe(plain);
      expect(ssr(field.render({ requiredValidation: "app" }))).toBe(plain);
    });
  }

  it("RTL (ar): the asterisk follows the label, aria-required is set and a blur shows no message", async () => {
    const { container } = inLocale(<PasswordField label="كلمة المرور" autoComplete="new-password" isRequired requiredValidation="app" />, "ar", "rtl");
    const label = container.querySelector("[data-slot='field-label']")!;
    expect(label.lastElementChild!.getAttribute("data-slot")).toBe("field-required");
    const input = container.querySelector<HTMLElement>("[data-slot='password-field-input']")!;
    expect(input.getAttribute("aria-required")).toBe("true");
    await visitAndLeave(input);
    expect(shownError(container)).toBeNull();
    expect(input.hasAttribute("aria-invalid")).toBe(false);
  });

  it("validate keeps its blur timing; only the empty-value check is the app's", async () => {
    inLocale(<TextField label="Password" isRequired requiredValidation="app" validate={(value) => (value && value.length < 3 ? "At least 3 characters." : null)} />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    await act(async () => input.focus());
    fireEvent.change(input, { target: { value: "ab" } });
    expect(shownError(document.body)).toBeNull();
    await act(async () => input.blur());
    expect(shownError(document.body)!.textContent).toBe("At least 3 characters.");
    // Emptying it clears that error and raises none of its own.
    await act(async () => input.focus());
    fireEvent.change(input, { target: { value: "" } });
    await act(async () => input.blur());
    expect(shownError(document.body)).toBeNull();
    expect(input.hasAttribute("aria-invalid")).toBe(false);
  });

  it("TextArea: the maxLength message still shows on blur", async () => {
    inLocale(<TextArea label="Notes" isRequired requiredValidation="app" maxLength={3} />);
    const area = screen.getByRole("textbox", { name: /Notes/ }) as HTMLTextAreaElement;
    await act(async () => area.focus());
    fireEvent.change(area, { target: { value: "abcde" } });
    // Not while typing.
    expect(shownError(document.body)).toBeNull();
    await act(async () => area.blur());
    expect(shownError(document.body)!.textContent).toBe("2 characters over the limit");
    expect(area.getAttribute("aria-invalid")).toBe("true");
    expect(description(area)).toContain("2 characters over the limit");
    expect(document.body.textContent).not.toContain(REQUIRED);
  });

  it("DateField: an impossible date (31.11) still shows its message on blur", async () => {
    const { container } = inLocale(<DateField label="Expiry date" isRequired requiredValidation="app" />);
    const day = container.querySelector<HTMLElement>("[data-slot='date-segment'][data-type='day']")!;
    await act(async () => day.focus());
    for (const data of "31112026") {
      await act(async () => {
        (document.activeElement ?? day).dispatchEvent(new InputEvent("beforeinput", { inputType: "insertText", data, bubbles: true, cancelable: true }));
      });
    }
    // Not while typing.
    expect(shownError(container)).toBeNull();
    await act(async () => (document.activeElement as HTMLElement | null)?.blur());
    expect(shownError(container)!.textContent).toBe("November has 30 days.");
    expect(container.querySelector("[data-slot='input-group']")?.hasAttribute("data-invalid")).toBe(true);
    expect(container.textContent).not.toContain(REQUIRED);
  });
});

/** A common app shape: validate on submit, own message, cleared when the user types. */
function SignUpForm({ onValid }: { onValid: () => void }) {
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const ref = React.useRef<HTMLInputElement>(null);
  return (
    <Form
      onSubmit={(event) => {
        event.preventDefault();
        if (!password) {
          setError("Choose a password.");
          ref.current?.focus();
          return;
        }
        onValid();
      }}
    >
      <PasswordField
        ref={ref}
        label="Password"
        autoComplete="new-password"
        isRequired
        requiredValidation="app"
        value={password}
        onChange={(next) => {
          setPassword(next);
          if (next) setError(null);
        }}
        // Only while there is an error: a controlled isInvalid={false} would override every check of the field.
        isInvalid={error !== null ? true : undefined}
        errorMessage={error}
      />
      <button type="submit">Create account</button>
    </Form>
  );
}

describe("requiredValidation=\"app\" in a DS Form: the app validates on submit", () => {
  it("submit reaches the app, whose error shows, describes the focused field and clears on typing (keyboard)", async () => {
    const onValid = vi.fn();
    const { container } = inLocale(<SignUpForm onValid={onValid} />);
    const input = container.querySelector<HTMLInputElement>("[data-slot='password-field-input']")!;
    await visitAndLeave(input);
    expect(shownError(container)).toBeNull();
    // Submit (Enter in the field submits the one-field form).
    await act(async () => {
      fireEvent.submit(container.querySelector("form")!);
    });
    expect(container.textContent).not.toContain(REQUIRED);
    const row = shownError(container)!;
    expect(row.textContent).toBe("Choose a password.");
    expect(document.activeElement).toBe(input);
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-required")).toBe("true");
    expect(ids(input, "aria-describedby")).toContain(row.id);
    expect(description(input)).toBe("Choose a password.");
    expect(onValid).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: "Secret-2026" } });
    expect(shownError(container)).toBeNull();
    expect(input.hasAttribute("aria-invalid")).toBe(false);
    await act(async () => {
      fireEvent.submit(container.querySelector("form")!);
    });
    expect(onValid).toHaveBeenCalledTimes(1);
  });

  it("without the option a DS Form still blocks the empty required field with its own message, as before", () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    inLocale(
      <Form onSubmit={onSubmit}>
        <PasswordField label="Password" autoComplete="new-password" isRequired />
        <button type="submit">Create account</button>
      </Form>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(REQUIRED)).toBeTruthy();
  });

  it("with the option a DS Form submit is not blocked by the empty value alone, and shows no DS message", () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    const { container } = inLocale(
      <Form onSubmit={onSubmit}>
        <TextField label="Name" isRequired requiredValidation="app" />
        <DateField label="Birth date" isRequired requiredValidation="app" />
        <button type="submit">Save</button>
      </Form>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(container.textContent).not.toContain(REQUIRED);
    expect(container.querySelector("[data-invalid]")).toBeNull();
  });
});
