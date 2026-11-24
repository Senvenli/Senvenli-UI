import * as React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "./provider";
import { cn } from "./utils";
import { Button } from "./action/index";
import { Badge, Card, CardBody } from "./display/index";
import { Input } from "./form/index";
import { Select } from "./selection/index";

afterEach(cleanup);

const classesOf = (element: Element | null) => (element?.getAttribute("class") ?? "").split(/\s+/);

describe("radius and the provider's defaults", () => {
  it("a later radius class replaces the designed one", () => {
    expect(cn("rounded-ds-large", "rounded-ds-full").split(" ")).toEqual(["rounded-ds-full"]);
    expect(cn("rounded-ds-medium", "rounded-none").split(" ")).toEqual(["rounded-none"]);
  });

  it("a component's own radius wins over the provider's; without either, the design's radius stays", () => {
    render(
      <DesignSystemProvider locale="en" navigate={vi.fn()} defaults={{ radius: "full" }}>
        <Button>Pill</Button>
        <Button radius="none">Square</Button>
        <Card><CardBody>Card</CardBody></Card>
        <Badge>Paid</Badge>
      </DesignSystemProvider>,
    );
    expect(classesOf(screen.getByRole("button", { name: "Pill" }))).toContain("rounded-ds-full");
    const square = classesOf(screen.getByRole("button", { name: "Square" }));
    expect(square).toContain("rounded-none");
    expect(square).not.toContain("rounded-ds-medium");
    expect(square).not.toContain("rounded-ds-control-medium");
    expect(classesOf(document.querySelector('[data-slot="card"]'))).toContain("rounded-ds-full");
    expect(classesOf(document.querySelector('[data-slot="badge"]'))).toContain("rounded-ds-full");
    cleanup();
    render(<Button>Designed</Button>);
    // The design's corner is the control step: the theme's medium radius, or fully round with controlShape "pill".
    expect(classesOf(screen.getByRole("button", { name: "Designed" }))).toContain("rounded-ds-control-medium");
  });

  it("fields take the radius on their frame, and the size from the provider", () => {
    render(
      <DesignSystemProvider locale="en" navigate={vi.fn()} defaults={{ size: "small" }}>
        <Input label="Email" type="email" radius="large" />
        <Select label="Plan" items={[{ id: "a", label: "A" }]} radius="full" />
        <Button>Small</Button>
      </DesignSystemProvider>,
    );
    const frame = document.querySelector('[data-slot="input-group"]');
    expect(classesOf(frame)).toContain("rounded-ds-large");
    expect(classesOf(document.querySelector('[data-slot="select-trigger"]'))).toContain("rounded-ds-full");
    expect(screen.getByRole("button", { name: "Small" }).getAttribute("data-size")).toBe("small");
  });
});
