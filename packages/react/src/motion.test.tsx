import * as React from "react";
import { cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "./provider";
import { MotionScope, useReducedMotion, type ComponentMotion } from "./defaults";
import { Button } from "./action/index";
import { DialogTrigger, Drawer } from "./overlay/index";

afterEach(cleanup);

function setDevice(reduce: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: reduce && query.includes("prefers-reduced-motion"), media: query,
    addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {},
  })) as unknown as typeof window.matchMedia;
}

describe("motion", () => {
  it("the provider's setting reaches CSS on the root element, and leaves with it", () => {
    const { unmount } = render(<DesignSystemProvider locale="en" navigate={vi.fn()} defaults={{ motion: "none" }}><p>x</p></DesignSystemProvider>);
    expect(document.documentElement.getAttribute("data-ds-motion")).toBe("none");
    unmount();
    expect(document.documentElement.hasAttribute("data-ds-motion")).toBe(false);
  });

  it("auto follows the device; reduce and none always reduce; nothing turns the device's setting off", () => {
    const wrap = (motion: ComponentMotion | undefined) => ({ children }: { children: React.ReactNode }) => <MotionScope motion={motion}>{children}</MotionScope>;
    setDevice(false);
    expect(renderHook(() => useReducedMotion(), { wrapper: wrap(undefined) }).result.current).toBe(false);
    expect(renderHook(() => useReducedMotion(), { wrapper: wrap("reduce") }).result.current).toBe(true);
    expect(renderHook(() => useReducedMotion(), { wrapper: wrap("none") }).result.current).toBe(true);
    setDevice(true);
    expect(renderHook(() => useReducedMotion(), { wrapper: wrap("auto") }).result.current).toBe(true);
  });

  it("a component's motion marks its own region, overlays in portals included", () => {
    setDevice(false);
    render(
      <DesignSystemProvider locale="en" navigate={vi.fn()}>
        <DialogTrigger>
          <Button>Open</Button>
          <Drawer title="Filters" motion="none">x</Drawer>
        </DialogTrigger>
      </DesignSystemProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(document.querySelector('[data-slot="drawer-overlay"]')!.getAttribute("data-ds-motion")).toBe("none");
  });
});
