import * as React from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PanelHeader, PanelHeaderBar, PanelHeaderProvider } from "./index";

afterEach(cleanup);

function Shell({ children, onMenuPress = vi.fn() }: { children: React.ReactNode; onMenuPress?: () => void }) {
  return (
    <PanelHeaderProvider>
      <PanelHeaderBar menuLabel="Open menu" onMenuPress={onMenuPress} />
      <main>{children}</main>
    </PanelHeaderProvider>
  );
}

describe("PanelHeader", () => {
  it("shows the page's title, description and breadcrumbs in the bar, outside the page content", () => {
    render(
      <Shell>
        <PanelHeader
          title="Release plan"
          description="Upcoming releases."
          breadcrumbs={[{ label: "Projects", href: "#projects" }, { label: "Release plan" }]}
        />
        <p>Content</p>
      </Shell>,
    );
    const bar = screen.getByRole("banner");
    expect(bar.getAttribute("data-slot")).toBe("panel-header-bar");
    expect(within(bar).getByRole("heading", { level: 1, name: "Release plan" })).toBeTruthy();
    expect(within(bar).getByText("Upcoming releases.")).toBeTruthy();
    expect(within(bar).getByRole("link", { name: "Projects" })).toBeTruthy();
    expect(within(screen.getByRole("main")).queryByRole("heading")).toBeNull();
  });

  it("puts the page's actions in the bar's actions region, and leaves it empty without them", () => {
    const { rerender } = render(
      <Shell>
        <PanelHeader title="Customers" actions={<button type="button">Add customer</button>} />
      </Shell>,
    );
    const actions = document.querySelector('[data-slot="panel-header-actions"]')!;
    expect(within(actions as HTMLElement).getByRole("button", { name: "Add customer" })).toBeTruthy();

    rerender(
      <Shell>
        <PanelHeader title="Customers" />
      </Shell>,
    );
    expect(document.querySelector('[data-slot="panel-header-actions"]')!.childElementCount).toBe(0);
  });

  it("follows the page: a new page's title replaces the old one", () => {
    const { rerender } = render(
      <Shell>
        <PanelHeader title="Orders" />
      </Shell>,
    );
    rerender(
      <Shell>
        <PanelHeader title="Billing" />
      </Shell>,
    );
    const bar = screen.getByRole("banner");
    expect(within(bar).getAllByRole("heading", { level: 1 }).map((h) => h.textContent)).toEqual(["Billing"]);
  });

  it("opens the navigation from the menu button, which is named by the caller", () => {
    const onMenuPress = vi.fn();
    render(
      <Shell onMenuPress={onMenuPress}>
        <PanelHeader title="Dashboard" />
      </Shell>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    expect(onMenuPress).toHaveBeenCalledTimes(1);
    // Shown under 1024px only; the Sidebar is in place above that.
    expect(document.querySelector('[data-slot="panel-header-menu"]')!.className.split(/\s+/)).toContain("lg:hidden");
  });

  it("renders in place without a bar, so a page never loses its title", () => {
    render(<PanelHeader title="Reports" description="Summary" actions={<button type="button">Export</button>} />);
    const inline = document.querySelector('[data-slot="panel-header-inline"]')!;
    expect(within(inline as HTMLElement).getByRole("heading", { level: 1, name: "Reports" })).toBeTruthy();
    expect(within(inline as HTMLElement).getByRole("button", { name: "Export" })).toBeTruthy();
    expect(within(inline as HTMLElement).getByRole("button", { name: "Export" }).closest('[data-slot="panel-header-inline-actions"]')).not.toBeNull();
  });

  it("renders a zero description, and no stray text for absent parts", () => {
    render(<PanelHeader title="Counter" description={0} />);
    const inline = document.querySelector('[data-slot="panel-header-inline"]')!;
    expect(inline.textContent).toBe("Counter0");
    expect(inline.querySelector('[data-slot="panel-header-inline-actions"]')).toBeNull();
  });

  it("belongs to the bar under a provider: with no bar mounted it shows nowhere, as the old slots did", () => {
    render(
      <PanelHeaderProvider>
        <main><PanelHeader title="Alone" /></main>
      </PanelHeaderProvider>,
    );
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
  });

  it("empties the bar's regions when the page goes", () => {
    const { rerender } = render(<Shell><PanelHeader title="Customers" actions={<button type="button">Add</button>} /></Shell>);
    rerender(<Shell>{null}</Shell>);
    expect(document.querySelector('[data-slot="panel-header-title"]')!.childElementCount).toBe(0);
    expect(document.querySelector('[data-slot="panel-header-actions"]')!.childElementCount).toBe(0);
  });

  it("stacks the actions under the title below 640px and keeps one row above it", () => {
    render(<Shell><PanelHeader title="Dashboard" /></Shell>);
    const classes = screen.getByRole("banner").className.split(/\s+/);
    expect(classes).toContain("flex-col");
    expect(classes).toContain("sm:flex-row");
    expect(classes).toContain("sm:min-h-16");
  });

  it("does not render the header twice while the bar mounts its regions", () => {
    act(() => {
      render(<Shell><PanelHeader title="Single" /></Shell>);
    });
    expect(screen.getAllByRole("heading", { level: 1, name: "Single" })).toHaveLength(1);
  });
});
