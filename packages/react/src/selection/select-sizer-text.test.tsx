import * as React from "react";
import { cleanup, render, within } from "@testing-library/react";
import { afterEach, beforeAll, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { Select } from "./index";

beforeAll(() => {
  globalThis.CSS ??= {} as typeof CSS;
  CSS.escape ??= (value: string) => value.replace(/[^\w-]/g, (char) => `\\${char}`);
});
afterEach(cleanup);

const ITEMS = [
  { id: "en", label: "English" },
  { id: "tr", label: "Turkish" },
  { id: "sc", label: "Self-Configure" },
];

it("reserves the widest label without text nodes: the trigger's text is the value alone", () => {
  render(
    <DesignSystemProvider locale="en" navigate={vi.fn()}>
      <Select aria-label="Language" items={ITEMS} defaultSelectedKey="en" />
    </DesignSystemProvider>,
  );
  const trigger = document.querySelector<HTMLElement>('[data-slot="select-trigger"]')!;
  // Find-in-page, copy and getByText see only the chosen value.
  expect(trigger.textContent).toBe("English");
  expect(within(trigger).queryAllByText("Self-Configure")).toHaveLength(0);
  const sizers = [...document.querySelectorAll('[data-slot="select-value-sizer"]')];
  expect(sizers).toHaveLength(4);
  for (const sizer of sizers) {
    expect(sizer.childNodes).toHaveLength(0);
    expect(sizer.className).toContain("before:content-[attr(data-text)]");
  }
});
