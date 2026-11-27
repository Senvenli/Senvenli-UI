import * as React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { Field, FormGroup } from "./index";

afterEach(cleanup);
const inLocale = (ui: React.ReactElement) => render(<DesignSystemProvider locale="en" navigate={vi.fn()}>{ui}</DesignSystemProvider>);

it("a Field in a horizontal FormGroup joins the rows; outside one its markup is unchanged", () => {
  inLocale(
    <>
      <FormGroup orientation="horizontal" separated>
        <Field label="Language" description="The interface language.">
          <button type="button">English</button>
        </Field>
      </FormGroup>
      <Field label="Plain" description="Stacked.">
        <input />
      </Field>
    </>,
  );
  const row = screen.getByText("Language").closest("div")!;
  expect(row.getAttribute("data-slot")).toBe("field");
  expect(row.className).toContain("ds-field-stack");
  expect(screen.getByText("Language").getAttribute("data-slot")).toBe("field-label");
  expect(screen.getByText("The interface language.").getAttribute("data-slot")).toBe("field-description");
  // The control keeps its labelling and description.
  expect(screen.getByRole("button", { name: "Language" }).getAttribute("aria-describedby")).toBe(screen.getByText("The interface language.").id);

  const plain = screen.getByText("Plain").closest("div")!;
  expect(plain.hasAttribute("data-slot")).toBe(false);
  expect(plain.className).not.toContain("ds-field-stack");
  expect(screen.getByText("Plain").getAttribute("data-slot")).toBe("label");
  expect(screen.getByText("Stacked.").hasAttribute("data-slot")).toBe(false);
});
