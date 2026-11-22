import * as React from "react";
import { renderToString } from "react-dom/server";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { TextArea } from "./index";
import { NumberField } from "./number-field";
import { PasswordField } from "./password-field";
import { SearchField } from "./search-field";
import { TextField } from "./text-field";
import { splitDataAttributes } from "./data-attributes";

/**
 * data-* on the DS text inputs: password managers' markers (data-1p-ignore, data-lpignore) on the
 * control, data-testid on the field's wrapper as before.
 */

afterEach(cleanup);

const MARKS = { "data-1p-ignore": "", "data-lpignore": "true", "data-form-type": "other", "data-testid": "code-field" };

const FIELDS: { name: string; wrapper: string; control: string; ui: (extra: Record<string, string>) => React.ReactElement }[] = [
  { name: "TextField", wrapper: "text-field", control: "text-field-input", ui: (extra) => <TextField label="Promo code" {...extra} /> },
  { name: "NumberField", wrapper: "number-field", control: "number-field-input", ui: (extra) => <NumberField label="Quantity" {...extra} /> },
  { name: "SearchField", wrapper: "search-field", control: "search-field-input", ui: (extra) => <SearchField label="Search" {...extra} /> },
  { name: "TextArea", wrapper: "text-area", control: "text-area-input", ui: (extra) => <TextArea label="Note" {...extra} /> },
  { name: "PasswordField", wrapper: "password-field", control: "password-field-input", ui: (extra) => <PasswordField label="Password" autoComplete="new-password" {...extra} /> },
];

const inLocale = (ui: React.ReactElement) => <DesignSystemProvider locale="en" navigate={vi.fn()}>{ui}</DesignSystemProvider>;

describe("data-* on the DS text inputs", () => {
  for (const field of FIELDS) {
    it(`${field.name}: password-manager markers on the control, data-testid on the wrapper, the DS's data-slot kept`, () => {
      const { container } = render(inLocale(field.ui(MARKS)));
      const wrapper = container.querySelector<HTMLElement>(`[data-slot='${field.wrapper}']`)!;
      const control = container.querySelector<HTMLElement>(`[data-slot='${field.control}']`)!;
      expect(control.getAttribute("data-1p-ignore")).toBe("");
      expect(control.getAttribute("data-lpignore")).toBe("true");
      expect(control.getAttribute("data-form-type")).toBe("other");
      expect(control.hasAttribute("data-testid")).toBe(false);
      expect(wrapper.getAttribute("data-testid")).toBe("code-field");
      for (const name of ["data-1p-ignore", "data-lpignore", "data-form-type"]) expect(wrapper.hasAttribute(name), name).toBe(false);
      expect(control.getAttribute("data-slot")).toBe(field.control);
    });

    it(`${field.name}: in the server render too`, () => {
      const html = renderToString(inLocale(field.ui({ "data-1p-ignore": "" })));
      expect(html).toMatch(new RegExp(`<(input|textarea)[^>]*data-1p-ignore=""[^>]*data-slot="${field.control}"`));
    });
  }

  it("a data-slot from the app never replaces the DS's own", () => {
    const { container } = render(inLocale(<TextField label="Promo code" {...{ "data-slot": "mine" }} />));
    expect(container.querySelector("[data-slot='text-field-input']")).not.toBeNull();
    expect(container.querySelector("[data-slot='text-field']")).not.toBeNull();
  });

  it("splitDataAttributes: data-testid and the rest stay; without data-* the same object comes back", () => {
    const plain = { label: "x", isRequired: true };
    expect(splitDataAttributes(plain).wrapperProps).toBe(plain);
    expect(splitDataAttributes(plain).controlData).toEqual({});
    const { wrapperProps, controlData } = splitDataAttributes({ label: "x", "data-testid": "t", "data-lpignore": "true", "aria-label": "y" });
    expect(wrapperProps).toEqual({ label: "x", "data-testid": "t", "aria-label": "y" });
    expect(controlData).toEqual({ "data-lpignore": "true" });
  });
});
