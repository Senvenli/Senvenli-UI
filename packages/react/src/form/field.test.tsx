import * as React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";

import { Field } from "./index";

// Field: the app-composed field row (label, control, hint, error).

afterEach(cleanup);

describe("Field from ./form", () => {
  it("wires the label to the control; an idle field has no describedby and is not invalid", () => {
    render(
      <Field label="Email" htmlFor="email">
        <input id="email" />
      </Field>,
    );
    const input = screen.getByLabelText("Email");
    expect(input.id).toBe("email");
    expect(document.querySelector("label")!.id).toBe("email-label");
    expect(input.hasAttribute("aria-describedby")).toBe(false);
    expect(input.hasAttribute("aria-invalid")).toBe(false);
  });

  it("a hint describes the control; an error replaces it, marks the control invalid and keeps its own describedby", () => {
    const { rerender } = render(
      <Field label="Name" htmlFor="name" hint="As on your ID">
        <input id="name" aria-describedby="extra" />
      </Field>,
    );
    const input = screen.getByLabelText("Name");
    const describedBy = () => (input.getAttribute("aria-describedby") ?? "").split(" ");
    expect(describedBy()[0]).toBe("extra");
    expect(document.getElementById(describedBy()[1]!)!.textContent).toBe("As on your ID");
    rerender(
      <Field label="Name" htmlFor="name" hint="As on your ID" error="Required">
        <input id="name" aria-describedby="extra" />
      </Field>,
    );
    expect(describedBy()).toHaveLength(2);
    expect(document.getElementById(describedBy()[1]!)!.textContent).toBe("Required");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(screen.queryByText("As on your ID")).toBeNull();
  });

  it("without htmlFor it generates the control id, injected on a single element child only", () => {
    render(
      <>
        <Field label="Note">
          <input />
        </Field>
        <Field label="Two">
          <input data-testid="a" />
          <input data-testid="b" />
        </Field>
      </>,
    );
    const input = screen.getByLabelText("Note");
    expect(input.id).toBeTruthy();
    expect(document.getElementById(`${input.id}-label`)!.tagName).toBe("LABEL");
    expect(screen.getByTestId("a").hasAttribute("id")).toBe(false);
    expect(screen.getByTestId("b").hasAttribute("id")).toBe(false);
  });

  it("the required mark takes the default or the given class; className joins the row's spacing", () => {
    const html = renderToStaticMarkup(
      <>
        <Field label="First name" htmlFor="a" required className="flex flex-col">
          <input id="a" />
        </Field>
        <Field label="Last name" htmlFor="b" required requiredClassName="text-ds-text-brand">
          <input id="b" />
        </Field>
      </>,
    );
    expect(html).toContain('<div class="space-y-ds-075 flex flex-col">');
    expect(html).toContain('<span class="ms-0.5 text-ds-text-danger">*</span>');
    expect(html).toContain('<span class="ms-0.5 text-ds-text-brand">*</span>');
  });

  it("a double click on the label text does not select it; a click on a control inside the label is left alone", () => {
    render(
      <Field label={<>Country <button type="button">?</button></>} htmlFor="cc">
        <input id="cc" />
      </Field>,
    );
    const label = document.querySelector("label")!;
    // fireEvent returns false when the default was prevented.
    expect(fireEvent.mouseDown(label, { detail: 1 })).toBe(true);
    expect(fireEvent.mouseDown(label, { detail: 2 })).toBe(false);
    expect(fireEvent.mouseDown(screen.getByRole("button", { name: "?" }), { detail: 2 })).toBe(true);
  });
});
