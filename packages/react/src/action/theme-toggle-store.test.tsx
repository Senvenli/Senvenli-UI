import * as React from "react";
import { act, cleanup, fireEvent, render, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { ThemeToggle } from "./index";
import { resetThemeStoresForTests } from "./theme-toggle";

beforeEach(() => resetThemeStoresForTests());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ThemeToggle store: write failures are per storage key", () => {
  it("a later successful write for another key does not drop this key's session-only choice", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key: string) {
      if (key === "a-theme") throw new Error("blocked");
    });
    const a = render(
      <DesignSystemProvider locale="en" navigate={vi.fn()}>
        <ThemeToggle storageKey="a-theme" />
      </DesignSystemProvider>,
    );
    act(() => {
      fireEvent.click(within(a.container).getByRole("radio", { name: /Dark/ }));
    });
    // Another key writes fine afterwards.
    const b = render(
      <DesignSystemProvider locale="en" navigate={vi.fn()}>
        <ThemeToggle storageKey="b-theme" />
      </DesignSystemProvider>,
    );
    act(() => {
      fireEvent.click(within(b.container).getByRole("radio", { name: /Light/ }));
    });
    expect(setItem).toHaveBeenCalledWith("b-theme", "light");
    // The last "a" toggle unmounts and a new one mounts: the session-only choice must survive.
    a.unmount();
    const again = render(
      <DesignSystemProvider locale="en" navigate={vi.fn()}>
        <ThemeToggle storageKey="a-theme" />
      </DesignSystemProvider>,
    );
    expect(within(again.container).getByRole("radio", { name: /Dark/ }).getAttribute("aria-checked")).toBe("true");
  });
});
