import * as React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Field, InputAddon, InputGroup, InputGroupInput } from "./index";

// A Field around an InputGroup: the label, hint and error reach the group's input, not its frame.

afterEach(cleanup);

describe("Field + InputGroup + InputGroupInput", () => {
  it("the label names the input and the hint describes it", () => {
    render(
      <Field label="Amount" htmlFor="amount" hint="Before tax">
        <InputGroup>
          <InputAddon position="start">$</InputAddon>
          <InputGroupInput inputMode="decimal" />
        </InputGroup>
      </Field>,
    );
    const input = screen.getByLabelText("Amount");
    expect(input.tagName).toBe("INPUT");
    expect(input.id).toBe("amount");
    expect(document.getElementById(input.getAttribute("aria-describedby")!)!.textContent).toBe("Before tax");
    expect(input.hasAttribute("aria-invalid")).toBe(false);
  });

  it("an error marks the input and the frame invalid and describes the input", () => {
    render(
      <Field label="Amount" htmlFor="amount" error="Enter an amount.">
        <InputGroup>
          <InputGroupInput />
        </InputGroup>
      </Field>,
    );
    const input = screen.getByLabelText("Amount");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(document.getElementById(input.getAttribute("aria-describedby")!)!.textContent).toBe("Enter an amount.");
    expect(document.querySelector("[data-slot='input-group']")!.hasAttribute("data-invalid")).toBe(true);
  });

  it("the input's own props win over the group's", () => {
    render(
      <InputGroup id="group" aria-describedby="group-hint">
        <InputGroupInput id="own" aria-describedby="own-hint" aria-label="Own" />
      </InputGroup>,
    );
    const input = screen.getByLabelText("Own");
    expect(input.id).toBe("own");
    expect(input.getAttribute("aria-describedby")).toBe("own-hint");
  });

  it("a disabled group disables its input", () => {
    render(
      <InputGroup isDisabled>
        <InputGroupInput aria-label="Code" />
      </InputGroup>,
    );
    expect((screen.getByLabelText("Code") as HTMLInputElement).disabled).toBe(true);
  });
});
