import * as React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Input } from "./form/index";
import { Box } from "./layout/index";
import { Tabs } from "./navigation/index";
import { DesignSystemProvider } from "./provider";
import { Checkbox, CheckboxGroup, Radio, RadioGroup, Slider, Switch } from "./selection/index";

// One radius scale, a large field, sizes on the choice controls and Slider, and Tabs variants and orientation.

afterEach(cleanup);

const items = [
  { id: "a", label: "First", panel: "One" },
  { id: "b", label: "Second", panel: "Two" },
];
const classOf = (slot: string) => document.querySelector(`[data-slot="${slot}"]`)?.getAttribute("class") ?? "";

describe("scales", () => {
  it("Box takes the components' radius scale, none included", () => {
    render(<Box radius="none">x</Box>);
    expect(screen.getByText("x").className).toContain("rounded-none");
  });

  it("a field is large on its own or from the provider", () => {
    render(
      <DesignSystemProvider defaults={{ size: "large" }}>
        <Input label="Name" />
      </DesignSystemProvider>,
    );
    expect(document.querySelector('[class*="min-h-ds-control-large"]')).not.toBeNull();
  });

  it("choice controls take a size, from a group too", () => {
    render(
      <DesignSystemProvider>
        <Checkbox size="large">Big</Checkbox>
        <RadioGroup label="Plan" size="small">
          <Radio value="a">A</Radio>
        </RadioGroup>
        <Switch size="large">Online</Switch>
        <Slider label="Volume" size="small" defaultValue={5} />
      </DesignSystemProvider>,
    );
    expect(classOf("checkbox-box")).toContain("size-5");
    expect(classOf("radio-dot")).toContain("size-3.5");
    expect(classOf("switch-track")).toContain("w-10");
    expect(classOf("slider-thumb")).toContain("size-4");
  });

  it("a CheckboxGroup size reaches its boxes; a box's own size wins", () => {
    render(
      <DesignSystemProvider>
        <CheckboxGroup label="Days" size="small">
          <Checkbox value="mon">Monday</Checkbox>
          <Checkbox value="tue" size="large">
            Tuesday
          </Checkbox>
        </CheckboxGroup>
      </DesignSystemProvider>,
    );
    const boxes = Array.from(document.querySelectorAll('[data-slot="checkbox-box"]')).map((box) => box.getAttribute("class") ?? "");
    expect(boxes[0]).toContain("size-3.5");
    expect(boxes[1]).toContain("size-5");
  });

  it("Tabs draws its variant and takes a vertical orientation", () => {
    render(
      <DesignSystemProvider>
        <Tabs aria-label="Pills" variant="pills" orientation="vertical" size="large" items={items} />
      </DesignSystemProvider>,
    );
    expect(screen.getByRole("tablist").getAttribute("aria-orientation")).toBe("vertical");
    expect(classOf("tab-indicator")).toContain("bg-ds-background-neutral");
    expect(classOf("tab")).toContain("h-12");
    expect(document.querySelector('[data-slot="tabs"]')?.getAttribute("data-variant")).toBe("pills");
  });
});
