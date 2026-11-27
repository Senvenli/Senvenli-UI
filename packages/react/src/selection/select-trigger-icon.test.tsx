import * as React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { Select } from "./index";

beforeAll(() => {
  globalThis.CSS ??= {} as typeof CSS;
  CSS.escape ??= (value: string) => value.replace(/[^\w-]/g, (char) => `\\${char}`);
});
afterEach(cleanup);
const inLocale = (ui: React.ReactElement) => render(<DesignSystemProvider locale="en" navigate={vi.fn()}>{ui}</DesignSystemProvider>);

const LANGUAGES = [
  { id: "en", label: "English", icon: <span data-testid="flag-en">GB</span> },
  { id: "de", label: "Deutsch", icon: <span data-testid="flag-de">DE</span> },
  { id: "plain", label: "Plain" },
];

it("the trigger shows the selected option's icon before its label, hidden from assistive tech", () => {
  inLocale(<Select label="Language" items={LANGUAGES} defaultSelectedKey="de" />);
  const trigger = document.querySelector<HTMLElement>('[data-slot="select-trigger"]')!;
  const icon = trigger.querySelector('[data-slot="select-value-icon"]')!;
  expect(icon.getAttribute("aria-hidden")).toBe("true");
  expect(icon.textContent).toBe("DE");
  expect(trigger.textContent).toContain("Deutsch");
  // The label alone names the value.
  expect(screen.getByRole("button", { name: /Deutsch/ }).getAttribute("aria-labelledby")).toBeTruthy();
});

it("no icon slot for an option without one, or while the placeholder shows", () => {
  inLocale(
    <>
      <Select label="A" items={LANGUAGES} defaultSelectedKey="plain" />
      <Select label="B" items={LANGUAGES} />
    </>,
  );
  expect(document.querySelectorAll('[data-slot="select-value-icon"]')).toHaveLength(0);
});
