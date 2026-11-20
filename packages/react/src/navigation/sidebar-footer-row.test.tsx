import * as React from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { Sidebar } from "./index";

/**
 * The link list's scrollbar shows only on hover, focus or while scrolling, never as a grey bar the full height of
 * the panel; the account and the collapse toggle share one row under a divider; and in the 56px rail the account is
 * exactly its 32px avatar, not cut in half by padding. The children and their order stay the same.
 */
afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute("data-ds-sidebar");
});

const items = [
  { id: "dashboard", label: "Dashboard", icon: "layout-dashboard" as const, href: "/" },
  { id: "billing", label: "Billing", icon: "wallet-cards" as const, href: "/billing" },
];

function Panel(props: Partial<React.ComponentProps<typeof Sidebar>>) {
  return (
    <DesignSystemProvider locale="en" navigate={vi.fn()}>
      <Sidebar
        aria-label="Navigation"
        brand={<span>Acme</span>}
        items={items}
        currentKey="billing"
        footer={<span>Ana Petrov</span>}
        isFooterPinned
        {...props}
      />
    </DesignSystemProvider>
  );
}

const classes = (element: Element | null) => (element?.getAttribute("class") ?? "").split(/\s+/);
const sidebar = () => document.querySelector('nav[data-slot="sidebar"]');

describe("Sidebar footer row and scrollbar", () => {
  it("hides the link list's scrollbar until hover or focus", () => {
    render(<Panel />);
    const scroll = sidebar()!.querySelector('[data-slot="sidebar-scroll"]');
    expect(classes(scroll)).toContain("[scrollbar-color:transparent_transparent]");
    expect(classes(scroll).some((name) => name.startsWith("hover:[scrollbar-color:"))).toBe(true);
    expect(classes(scroll).some((name) => name.startsWith("focus-within:[scrollbar-color:"))).toBe(true);
  });

  it("does the same when the whole nav scrolls (no pinned footer)", () => {
    render(<Panel isFooterPinned={false} />);
    expect(classes(sidebar())).toContain("[scrollbar-color:transparent_transparent]");
  });

  it("puts the account and the toggle on one row under a divider", () => {
    render(<Panel />);
    const footer = sidebar()!.querySelector('[data-slot="sidebar-footer"]')!;
    const toggle = sidebar()!.querySelector('[data-slot="sidebar-toggle"]')!;
    const bottom = footer.parentElement!;
    expect(toggle.parentElement).toBe(bottom);
    expect(classes(bottom)).toContain("grid");
    expect(classes(bottom)).toContain("grid-cols-[minmax(0,1fr)_auto]");
    for (const element of [footer, toggle]) {
      expect(classes(element)).toContain("border-t");
      expect(classes(element)).toContain("pt-ds-150");
    }
    expect(classes(toggle)).not.toContain("col-span-full");
  });

  it("stacks them in the rail, the account exactly its avatar wide with no padding", () => {
    render(<Panel isCollapsed />);
    const footer = sidebar()!.querySelector('[data-slot="sidebar-footer"]')!;
    expect(classes(footer.parentElement)).toContain("group-data-[collapsed]/sidebar:grid-cols-1");
    expect(classes(footer)).toContain("group-data-[collapsed]/sidebar:w-8");
    expect(classes(footer)).toContain("group-data-[collapsed]/sidebar:p-0");
  });

  it("a toggle with no account spans the row on its own", () => {
    render(<Panel footer={undefined} />);
    const toggle = sidebar()!.querySelector('[data-slot="sidebar-toggle"]')!;
    expect(classes(toggle)).toContain("col-span-full");
    expect(classes(toggle)).not.toContain("border-t");
  });
});
