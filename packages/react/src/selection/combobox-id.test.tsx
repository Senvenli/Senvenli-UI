import * as React from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { ComboBox } from "./index";

// ComboBox id + aria-describedby: an app's form row may render its own label (`<label htmlFor={id}>`) and its own
// hint or error, and bind them to the field through `id` and `aria-describedby`.

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
const dsWarnings = () => warn.mock.calls.map(([message]: unknown[]) => String(message)).filter((message: string) => message.startsWith("ComboBox:"));

function inLocale(ui: React.ReactElement, locale = "en", dir?: "rtl") {
  return render(
    <div dir={dir}>
      <DesignSystemProvider locale={locale} navigate={vi.fn()}>{ui}</DesignSystemProvider>
    </div>,
  );
}

const COUNTRIES = [
  { id: "ME", label: "Montenegro" },
  { id: "TR", label: "Turkey" },
  { id: "RS", label: "Serbia" },
];

/** An app's form row: its own label above, its own hint below, the DS field in between. */
function FormRow(props: Partial<React.ComponentProps<typeof ComboBox>> & { multiple?: boolean }) {
  const { multiple, ...rest } = props;
  return (
    <div>
      <label htmlFor="countryCode">Service country</label>
      {multiple ? (
        <ComboBox selectionMode="multiple" id="countryCode" aria-describedby="countryCode-hint" items={COUNTRIES} {...(rest as object)} />
      ) : (
        <ComboBox id="countryCode" aria-describedby="countryCode-hint" items={COUNTRIES} {...(rest as object)} />
      )}
      <p id="countryCode-hint">The country the service is offered in.</p>
    </div>
  );
}

const describedBy = (element: Element) => (element.getAttribute("aria-describedby") ?? "").split(" ").filter(Boolean);

describe("ComboBox id and aria-describedby", () => {
  it.each([["single", false], ["multiple", true]] as const)("%s: the external <label htmlFor> names the input; the id is on the input only", (_, multiple) => {
    inLocale(<FormRow multiple={multiple} />);
    const input = screen.getByRole("combobox", { name: "Service country" });
    expect(input.id).toBe("countryCode");
    expect(document.querySelectorAll("#countryCode")).toHaveLength(1);
    // No label of the field's own: an empty one would take the name over through aria-labelledby. The input
    // takes the external label's text as its name instead (React Aria knows no name from `for` alone); the app's
    // label, which has no id, is left as it is.
    expect(document.querySelector("[data-slot='field-label']")).toBeNull();
    expect(input.getAttribute("aria-label")).toBe("Service country");
    expect(input.hasAttribute("aria-labelledby")).toBe(false);
    expect(screen.getByText("Service country").hasAttribute("id")).toBe(false);
    expect((input as HTMLInputElement).labels).toHaveLength(1);
    expect(dsWarnings()).toEqual([]);
    expect(warn.mock.calls.map(([message]: unknown[]) => String(message))).toEqual([]);
  });

  it.each([["single", false], ["multiple", true]] as const)("%s: aria-describedby reaches the input, beside the field's own description and error", (_, multiple) => {
    inLocale(<FormRow multiple={multiple} description="Available countries" isInvalid errorMessage="Choose a country." />);
    const input = screen.getByRole("combobox", { name: "Service country" });
    const ids = describedBy(input);
    expect(ids).toContain("countryCode-hint");
    const texts = ids.map((id) => document.getElementById(id)?.textContent);
    expect(texts).toEqual(expect.arrayContaining(["The country the service is offered in.", "Available countries", "Choose a country."]));
    expect(input.getAttribute("aria-invalid")).toBe("true");
  });

  it("an external label with its own id keeps it; the input points at that id", () => {
    inLocale(
      <>
        <label htmlFor="plan-country" id="own-label">Country</label>
        <ComboBox id="plan-country" items={COUNTRIES} />
      </>,
    );
    const input = screen.getByRole("combobox", { name: "Country" });
    expect(input.getAttribute("aria-labelledby")).toBe("own-label");
    expect(document.getElementById("own-label")!.tagName).toBe("LABEL");
  });

  it("the app's label is never changed: no id is written, none is left after unmount, an id used elsewhere is not taken", () => {
    const { rerender } = inLocale(
      <>
        <span id="countryCode-label">Another element</span>
        <FormRow />
      </>,
    );
    const input = screen.getByRole("combobox", { name: "Service country" });
    expect(input.getAttribute("aria-labelledby")).toBeNull();
    expect(document.querySelectorAll("[id='countryCode-label']")).toHaveLength(1);
    const appLabel = screen.getByText("Service country");
    rerender(
      <div>
        <DesignSystemProvider locale="en" navigate={vi.fn()}>
          <label htmlFor="countryCode">Service country</label>
        </DesignSystemProvider>
      </div>,
    );
    expect(appLabel.hasAttribute("id")).toBe(false);
  });

  it("server render: the input points at {id}-label (names nothing), so the native label binding names it until hydration", () => {
    const html = renderToStaticMarkup(
      <DesignSystemProvider locale="en" navigate={vi.fn()}>
        <FormRow />
      </DesignSystemProvider>,
    );
    expect(html).toContain('aria-labelledby="countryCode-label"');
    expect(html).not.toContain('id="countryCode-label"');
  });

  it("works with a visible label too: the field's own label names it, the external description still binds", () => {
    inLocale(<ComboBox label="Country" id="country" aria-describedby="hint" items={COUNTRIES} />);
    const input = screen.getByRole("combobox", { name: "Country" });
    expect(input.id).toBe("country");
    expect(describedBy(input)).toContain("hint");
    expect(document.querySelector("[data-slot='field-label']")!.getAttribute("for")).toBe("country");
  });

  it("an aria-label still wins over an external label", () => {
    inLocale(<FormRow aria-label="Country filter" />);
    expect(screen.getByRole("combobox", { name: "Country filter" }).id).toBe("countryCode");
  });

  it("keyboard: typing filters, arrows move, Enter picks; the value reports and the label shows", () => {
    const onSelectionChange = vi.fn();
    inLocale(<FormRow onSelectionChange={onSelectionChange} />);
    const input = screen.getByRole("combobox", { name: "Service country" }) as HTMLInputElement;
    act(() => input.focus());
    fireEvent.change(input, { target: { value: "tur" } });
    const listbox = screen.getByRole("listbox");
    expect(within(listbox).getAllByRole("option").map((option) => option.textContent)).toEqual(["Turkey"]);
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSelectionChange).toHaveBeenLastCalledWith("TR");
    expect(input.value).toBe("Turkey");
    expect(document.activeElement).toBe(input);
  });

  it("a label tap focuses the input (the native label binding)", () => {
    inLocale(<FormRow />);
    fireEvent.click(screen.getByText("Service country"));
    // jsdom does not move focus on a label click; the binding it relies on is the label's control.
    expect((screen.getByText("Service country") as HTMLLabelElement).control).toBe(screen.getByRole("combobox"));
  });

  it("RTL in ar: the external label and description bind the same way", () => {
    inLocale(<FormRow />, "ar", "rtl");
    const input = screen.getByRole("combobox", { name: "Service country" });
    expect(describedBy(input)).toContain("countryCode-hint");
    expect(screen.getByRole("button", { name: /.+/ }).getAttribute("aria-label")).toBeTruthy();
  });

  it("an id with no label anywhere still warns in development (nothing names the field)", () => {
    inLocale(<ComboBox id="lonely" items={COUNTRIES} />);
    expect(dsWarnings()).toHaveLength(1);
  });

  it("without id and aria-describedby: React Aria's own id, the field's own label, only its own descriptions", () => {
    inLocale(<ComboBox label="Country" items={COUNTRIES} description="D" />);
    const input = screen.getByRole("combobox", { name: "Country" });
    expect(input.id).toMatch(/^react-aria-/);
    expect(document.querySelector("[data-slot='field-label']")!.getAttribute("for")).toBe(input.id);
    for (const id of describedBy(input)) expect(document.getElementById(id)!.closest("[data-slot='combobox']")).not.toBeNull();
    cleanup();
    inLocale(<ComboBox aria-label="Country" items={COUNTRIES} />);
    expect(screen.getByRole("combobox", { name: "Country" }).hasAttribute("aria-describedby")).toBe(false);
    expect(document.querySelector("[data-slot='field-label']")).toBeNull();
    expect(dsWarnings()).toEqual([]);
  });
});

describe("ComboBox external label without an id: the name leaves out hidden text", () => {
  function Row({ children }: { children: React.ReactNode }) {
    return (
      <div>
        <label htmlFor="country">{children}</label>
        <ComboBox id="country" items={COUNTRIES} />
      </div>
    );
  }

  it("an aria-hidden required mark is not part of the name", () => {
    inLocale(<Row>Country <span aria-hidden="true">*</span></Row>);
    const input = screen.getByRole("combobox", { name: "Country" });
    expect(input.getAttribute("aria-label")).toBe("Country");
    // The app's label keeps its mark: only the name leaves it out.
    expect(document.querySelector("label")!.textContent).toBe("Country *");
  });

  it("hidden parts (hidden, display: none, visibility: hidden, nested aria-hidden) are left out; the rest joins with single spaces", () => {
    inLocale(
      <Row>
        Service <span hidden>hidden</span>
        <span style={{ display: "none" }}>none</span>
        <span style={{ visibility: "hidden" }}>invisible</span>
        <b>country <i aria-hidden="true"><span>(required)</span></i></b>
      </Row>,
    );
    expect(screen.getByRole("combobox").getAttribute("aria-label")).toBe("Service country");
  });

  it("a label that is all hidden names nothing, so the no-name path stays as before (no empty aria-label)", () => {
    inLocale(<Row><span aria-hidden="true">*</span></Row>);
    expect(screen.getByRole("combobox").hasAttribute("aria-label")).toBe(false);
  });

  it("a label with an id still names the input by aria-labelledby (its hidden text is the browser's to skip)", () => {
    inLocale(
      <div>
        <label htmlFor="country" id="country-label">Country <span aria-hidden="true">*</span></label>
        <ComboBox id="country" items={COUNTRIES} />
      </div>,
    );
    const input = screen.getByRole("combobox", { name: "Country" });
    expect(input.getAttribute("aria-labelledby")).toBe("country-label");
    expect(input.hasAttribute("aria-label")).toBe(false);
  });

  it("RTL in ar: the same name without the mark", () => {
    inLocale(<Row>البلد <span aria-hidden="true">*</span></Row>, "ar", "rtl");
    expect(screen.getByRole("combobox").getAttribute("aria-label")).toBe("البلد");
  });
});
