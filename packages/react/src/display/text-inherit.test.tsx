import * as React from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Heading, Text } from "./index";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
const text = () => document.querySelector<HTMLElement>('[data-slot="text"]')!;

describe("Text size=\"inherit\"", () => {
  it("adds no type step, so a toned run in a heading keeps the heading's size, line height and weight", () => {
    render(
      <Heading level={1} size="display-medium">
        Run <Text tone="brand" size="inherit">every fleet.</Text>
      </Heading>,
    );
    const classes = text().className.split(/\s+/);
    expect(classes).toContain("text-ds-text-brand");
    expect(classes.filter((name) => name.startsWith("text-") && name !== "text-ds-text-brand")).toEqual([]);
    expect(classes).not.toContain("font-medium");
  });

  it("still sets medium when asked", () => {
    render(<Text size="inherit" weight="medium">Bold run</Text>);
    expect(text().className).toContain("font-medium");
  });

  it("keeps body as the default outside a heading, with no warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<Text>Body</Text>);
    expect(text().className).toContain("text-body");
    expect(warn).not.toHaveBeenCalled();
  });
});

describe("Text inside a Heading", () => {
  it("warns once when it keeps the default body size", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { rerender } = render(
      <Heading level={2}>
        Plans <Text tone="brand">for teams</Text>
      </Heading>,
    );
    rerender(
      <Heading level={2}>
        Plans <Text tone="brand">for every team</Text>
      </Heading>,
    );
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]![0])).toContain('size="inherit"');
  });

  it("stays quiet when the size is set, inherit or a step", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(
      <Heading level={2}>
        Plans <Text tone="brand" size="inherit">for teams</Text> <Text size="body-small">beta</Text>
      </Heading>,
    );
    expect(warn).not.toHaveBeenCalled();
  });
});
