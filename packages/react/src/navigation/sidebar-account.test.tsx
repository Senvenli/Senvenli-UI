import * as React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { Sidebar, SidebarAccount } from "./index";

beforeAll(() => {
  // jsdom lacks CSS.escape, which React Aria's menus use to find items.
  globalThis.CSS ??= {} as typeof CSS;
  CSS.escape ??= (value: string) => value.replace(/[^\w-]/g, (char) => `\\${char}`);
});
afterEach(cleanup);

const inLocale = (ui: React.ReactElement) => render(<DesignSystemProvider locale="en" navigate={vi.fn()}>{ui}</DesignSystemProvider>);

function Shell({ collapsed, onAction }: { collapsed?: boolean; onAction?: (id: React.Key) => void }) {
  return (
    <Sidebar
      brand="Acme"
      defaultCollapsed={collapsed}
      items={[{ id: "home", label: "Home", icon: "house", href: "#" }]}
      footer={
        <SidebarAccount
          name="Sofia Marin"
          description="sofia@example.com"
          items={[
            { id: "settings", label: "Settings" },
            { id: "sign-out", label: "Sign out", tone: "danger" },
          ]}
          onAction={onAction}
        />
      }
    />
  );
}

describe("SidebarAccount", () => {
  it("a row named once by the person, that opens the account menu", () => {
    const onAction = vi.fn();
    inLocale(<Shell onAction={onAction} />);
    const trigger = screen.getByRole("button", { name: "Sofia Marin" });
    expect(trigger.getAttribute("data-slot")).toBe("sidebar-account");
    expect(screen.getByText("sofia@example.com")).toBeTruthy();
    act(() => {
      fireEvent.pointerDown(trigger, { pointerType: "mouse", button: 0 });
      fireEvent.pointerUp(trigger, { pointerType: "mouse", button: 0 });
      fireEvent.click(trigger);
    });
    fireEvent.click(screen.getByRole("menuitem", { name: "Sign out" }));
    expect(onAction).toHaveBeenCalledWith("sign-out");
  });

  it("collapsed: the square of a nav icon, the avatar centred, the name kept for screen readers", () => {
    inLocale(<Shell collapsed />);
    const trigger = document.querySelector<HTMLElement>('[data-slot="sidebar-account"]')!;
    const classes = trigger.className;
    expect(classes).toContain("group-data-[collapsed]/sidebar:size-8");
    expect(classes).toContain("group-data-[collapsed]/sidebar:justify-center");
    expect(classes).toContain("rounded-ds-medium");
    // The text is visually hidden, not removed; the button is named by the person.
    expect(trigger.querySelector('[data-slot="sidebar-account-text"]')!.className).toContain("group-data-[collapsed]/sidebar:sr-only");
    expect(screen.getByRole("button", { name: "Sofia Marin" })).toBe(trigger);
  });
});
