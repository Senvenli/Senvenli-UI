import * as React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { Form, FormGroup, FormSection, Input } from "./index";
import { Switch, Checkbox } from "../selection/index";

afterEach(cleanup);
const inLocale = (ui: React.ReactElement) => render(<DesignSystemProvider locale="en" navigate={vi.fn()}>{ui}</DesignSystemProvider>);

describe("settings layout", () => {
  it("Form width wide caps at 800px, start-aligned", () => {
    inLocale(<Form width="wide"><Input label="Name" /></Form>);
    const form = document.querySelector<HTMLElement>('[data-slot="form"]')!;
    expect(form.className).toContain("max-w-[800px]");
    expect(form.className).not.toContain("mx-auto");
  });

  it("FormSection: a description that describes the fieldset, and a rule with separator", () => {
    inLocale(
      <FormSection legend="Language" description="How dates and numbers look." separator>
        <Input label="Region" />
      </FormSection>,
    );
    const fieldset = screen.getByRole("group", { name: "Language" });
    expect(document.getElementById(fieldset.getAttribute("aria-describedby")!)!.textContent).toBe("How dates and numbers look.");
    expect(fieldset.className).toContain("border-t");
  });

  it("FormSection split: the fieldset keeps its name; the title and description sit in a start column", () => {
    inLocale(
      <FormSection legend="Appearance" description="Theme and density." layout="split">
        <Input label="Accent" />
      </FormSection>,
    );
    const fieldset = screen.getByRole("group", { name: "Appearance" });
    expect(fieldset.getAttribute("data-layout")).toBe("split");
    expect(document.getElementById(fieldset.getAttribute("aria-describedby")!)!.textContent).toBe("Theme and density.");
    // The visible title is not read twice.
    expect(fieldset.querySelector('[data-slot="form-section-legend"]')!.closest("[aria-hidden]")).not.toBeNull();
    expect(screen.getByRole("textbox", { name: "Accent" })).toBeTruthy();
  });

  it("FormGroup horizontal: fields become rows; a Switch and a Checkbox move their control to the end", () => {
    inLocale(
      <FormGroup orientation="horizontal" separated>
        <Input label="Workspace name" description="Shown in the sidebar." />
        <Switch description="Email a summary every morning.">Daily summary</Switch>
        <Checkbox>Beta features</Checkbox>
      </FormGroup>,
    );
    const group = document.querySelector<HTMLElement>('[data-slot="form-group"]')!;
    expect(group.getAttribute("data-orientation")).toBe("horizontal");
    expect(group.className).toContain("@container");
    expect(group.className).toContain("divide-y");
    // Fields keep their own labelling: the row layout is CSS on the stack.
    expect(screen.getByRole("textbox", { name: "Workspace name" }).closest(".ds-field-stack")).not.toBeNull();
    expect(document.querySelector('[data-slot="switch"]')!.getAttribute("data-control-placement")).toBe("end");
    expect(document.querySelector('[data-slot="checkbox"]')!.getAttribute("data-control-placement")).toBe("end");
    expect(screen.getByRole("switch", { name: "Daily summary" })).toBeTruthy();
  });

  it("outside a horizontal group the control stays at the start, unless asked", () => {
    inLocale(
      <>
        <Switch>Default</Switch>
        <Switch controlPlacement="end">Asked</Switch>
      </>,
    );
    const [first, second] = document.querySelectorAll('[data-slot="switch"]');
    expect(first!.hasAttribute("data-control-placement")).toBe(false);
    expect(second!.getAttribute("data-control-placement")).toBe("end");
  });
});
