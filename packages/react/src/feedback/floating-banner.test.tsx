import fs from "node:fs";
import * as React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createTheme, toCSS } from "@senvenli/tokens";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Button, Fab, Link } from "../action/index";
import { DS_STRINGS } from "../i18n";
import { FLOATING_BANNER_OFFSET, LAYER } from "../layers";
import { DesignSystemProvider } from "../provider";
import { Banner } from "./index";

// A helper, not an inline `new URL("…", import.meta.url)`: Vite rewrites that literal form into an asset URL.
const here = (file: string) => new URL(file, import.meta.url);
const theme = toCSS(createTheme(), { tailwind: true }) + fs.readFileSync(here("../../styles/theme.css"), "utf8");
const PHYSICAL = /(^|\s|:)(-?m[lr]-|p[lr]-|-?left-|-?right-|border-[lr](-|\s|$)|rounded-[lr]-|text-left|text-right)/;
const classesOf = (element: Element | null | undefined) => element?.getAttribute("class") ?? "";
const slot = (name: string, root: ParentNode = document) => root.querySelector(`[data-slot="${name}"]`);

function inProvider(ui: React.ReactElement) {
  return render(<DesignSystemProvider locale="en" navigate={vi.fn()}>{ui}</DesignSystemProvider>);
}

const press = (element: HTMLElement) => {
  act(() => element.focus());
  fireEvent.keyDown(element, { key: "Enter" });
  fireEvent.keyUp(element, { key: "Enter" });
};

function Consent({ onDismiss = vi.fn(), onAccept = vi.fn() }: { onDismiss?: () => void; onAccept?: () => void }) {
  return (
    <Banner
      placement="floating"
      aria-label="Cookie notice"
      icon="cookie"
      actions={<Button size="compact" onPress={onAccept}>Got it</Button>}
      onDismiss={onDismiss}
    >
      We use essential cookies to run the site. Details are in the <Link href="/cookie-policy" variant="inline">cookie policy</Link>.
    </Banner>
  );
}

afterEach(cleanup);

/**
 * jsdom has no layout: give elements matching `pick` a box reaching `up` px from the viewport bottom
 * (null: not rendered), and everything else a box at the bottom with no height.
 */
function layout(pick: (element: HTMLElement) => number | { up: number; bottomGap: number } | null | undefined) {
  const rect = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    const value = pick(this);
    const vh = window.innerHeight;
    if (value === null) return { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON() {} } as DOMRect;
    if (value === undefined) return { top: vh, left: 0, right: 0, bottom: vh, width: 0, height: 0, x: 0, y: vh, toJSON() {} } as DOMRect;
    // A number reaches up from the very bottom; { up, bottomGap } sits bottomGap above it.
    const { up, bottomGap } = typeof value === "number" ? { up: value, bottomGap: 0 } : value;
    return { top: vh - up, left: 0, right: 0, bottom: vh - bottomGap, width: 100, height: up - bottomGap, x: 0, y: vh - up, toJSON() {} } as DOMRect;
  });
  const rects = vi.spyOn(HTMLElement.prototype, "getClientRects").mockImplementation(function (this: HTMLElement) {
    return (pick(this) === null ? [] : [{}]) as unknown as DOMRectList;
  });
  return () => {
    rect.mockRestore();
    rects.mockRestore();
  };
}

describe("Banner placement=floating", () => {
  it("is a named region at the end of the page, not a dialog, that takes no focus", () => {
    const { container } = inProvider(
      <>
        <main><button>Page button</button></main>
        <Consent />
      </>,
    );
    const region = screen.getByRole("region", { name: "Cookie notice" });
    expect(region.getAttribute("data-placement")).toBe("floating");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(region.hasAttribute("aria-modal")).toBe(false);
    // Portalled after the main content, so it follows it in tab order.
    expect(container.contains(region)).toBe(false);
    expect(document.body.lastElementChild?.contains(region)).toBe(true);
    // It does not take focus when it appears.
    expect(region.contains(document.activeElement)).toBe(false);
  });

  it("reaches its action, the policy link and dismiss from the keyboard; Esc does nothing", () => {
    const onDismiss = vi.fn();
    const onAccept = vi.fn();
    const navigate = vi.fn();
    render(<DesignSystemProvider locale="en" navigate={navigate}><Consent onDismiss={onDismiss} onAccept={onAccept} /></DesignSystemProvider>);
    const link = screen.getByRole("link", { name: "cookie policy" });
    expect(link.tabIndex).toBe(0);
    const accept = screen.getByRole("button", { name: "Got it" });
    press(accept);
    expect(onAccept).toHaveBeenCalledTimes(1);
    const close = screen.getByRole("button", { name: DS_STRINGS.close.en });
    expect(close.getAttribute("data-slot")).toBe("banner-dismiss");
    fireEvent.keyDown(close, { key: "Escape" });
    expect(onDismiss).not.toHaveBeenCalled();
    press(close);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("sits on the overlay surface, fixed to the bottom above the safe area, 720px wide at most and centred", () => {
    inProvider(<Consent />);
    const region = screen.getByRole("region") as HTMLElement;
    expect(classesOf(region).split(/\s+/)).toEqual(expect.arrayContaining([
      // Side insets clear the notch.
      "fixed", "[left:max(var(--ds-space-150),env(safe-area-inset-left,0px))]", "[right:max(var(--ds-space-150),env(safe-area-inset-right,0px))]", "min-[480px]:[left:max(var(--ds-space-200),env(safe-area-inset-left,0px))]", "min-[480px]:[right:max(var(--ds-space-200),env(safe-area-inset-right,0px))]", "mx-auto", "max-w-[720px]", "max-h-[25dvh]",
      "bg-ds-surface-overlay", "inset-ring-ds-border", "shadow-ds-overlay", "rounded-ds-large", LAYER.floatingBanner,
    ]));
    expect(region.style.bottom).toBe("calc(var(--ds-space-200) + env(safe-area-inset-bottom, 0px))");
    expect(slot("banner-icon", region)?.getAttribute("data-icon")).toBe("cookie");
    // Actions inline from 480px, a row of their own below the text on phones.
    expect(classesOf(slot("banner-actions", region)).split(/\s+/)).toEqual(expect.arrayContaining(["col-span-full", "min-[480px]:col-span-1"]));
    for (const utility of classesOf(region).split(/\s+/)) {
      const color = /(?:^|:)(?:bg|text|inset-ring)-(ds-(?:background|surface|text|border)[a-z-]*)$/.exec(utility);
      if (color) expect(theme, utility).toContain(`--color-${color[1]}:`);
    }
  });

  it("sits above a sticky bottom bar, by length or by measuring it", () => {
    inProvider(<Banner placement="floating" aria-label="Cookies" avoid="72px">Essential cookies.</Banner>);
    expect((screen.getByRole("region") as HTMLElement).style.bottom).toContain("+ 72px");
    cleanup();
    function WithBar() {
      const bar = React.useRef<HTMLDivElement>(null);
      return (
        <>
          <div ref={bar} data-testid="bar">Back · Continue</div>
          <Banner placement="floating" aria-label="Cookies" avoid={bar}>Essential cookies.</Banner>
        </>
      );
    }
    // The bar reaches 64px up from the bottom of the viewport; it clears the safe area itself.
    const restore = layout((element) => (element.getAttribute("data-testid") === "bar" ? 64 : undefined));
    try {
      inProvider(<WithBar />);
      const bottom = (screen.getByRole("region") as HTMLElement).style.bottom;
      expect(bottom).toBe("calc(var(--ds-space-200) + 64px)");
    } finally {
      restore();
    }
  });

  it("ignores a bar hidden with CSS or not yet pinned to the bottom", () => {
    function WithBar({ state }: { state: "hidden" | "in-flow" }) {
      const bar = React.useRef<HTMLDivElement>(null);
      return (
        <>
          <div ref={bar} data-testid="bar" data-state={state} />
          <Banner placement="floating" aria-label="Cookies" avoid={bar}>Essential cookies.</Banner>
        </>
      );
    }
    // Hidden (display: none): no box at all.
    let restore = layout((element) => (element.getAttribute("data-state") === "hidden" ? null : undefined));
    try {
      inProvider(<WithBar state="hidden" />);
      expect((screen.getByRole("region") as HTMLElement).style.bottom).toBe("calc(var(--ds-space-200) + env(safe-area-inset-bottom, 0px))");
    } finally {
      restore();
    }
    cleanup();
    // In flow: a 64px sticky bar whose bottom is still 300px above the viewport's.
    restore = layout((element) => (element.getAttribute("data-state") === "in-flow" ? { up: 364, bottomGap: 300 } : undefined));
    try {
      inProvider(<WithBar state="in-flow" />);
      expect((screen.getByRole("region") as HTMLElement).style.bottom).toBe("calc(var(--ds-space-200) + env(safe-area-inset-bottom, 0px))");
    } finally {
      restore();
    }
  });

  it("notices a sticky bar that pins while the page scrolls", () => {
    let pinned = false;
    const restore = layout((element) => (element.getAttribute("data-testid") === "bar" ? (pinned ? 60 : { up: 360, bottomGap: 300 }) : undefined));
    const frames = vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    function WithBar() {
      const bar = React.useRef<HTMLDivElement>(null);
      return (
        <>
          <div ref={bar} data-testid="bar" />
          <Banner placement="floating" aria-label="Cookies" avoid={bar}>x</Banner>
        </>
      );
    }
    const removed = vi.spyOn(window, "removeEventListener");
    try {
      const { unmount } = inProvider(<WithBar />);
      const region = () => screen.getByRole("region") as HTMLElement;
      expect(region().style.bottom).toBe("calc(var(--ds-space-200) + env(safe-area-inset-bottom, 0px))");
      pinned = true;
      fireEvent.scroll(window);
      expect(region().style.bottom).toBe("calc(var(--ds-space-200) + 60px)");
      unmount();
      // The scroll listener goes with the banner.
      expect(removed.mock.calls.some(([type, , options]) => type === "scroll" && (options as AddEventListenerOptions | undefined)?.capture === true)).toBe(true);
    } finally {
      removed.mockRestore();
      frames.mockRestore();
      restore();
    }
  });

  it("follows a sticky bar that appears later or goes away", () => {
    const restore = layout((element) => (element.getAttribute("data-testid") === "bar" ? 80 : undefined));
    function Page({ bar, avoid }: { bar: boolean; avoid: boolean }) {
      const ref = React.useRef<HTMLDivElement>(null);
      return (
        <>
          {bar && <div ref={ref} data-testid="bar" />}
          <Banner placement="floating" aria-label="Cookies" avoid={avoid ? ref : undefined}>Essential cookies.</Banner>
        </>
      );
    }
    const ui = (bar: boolean, avoid: boolean) => <DesignSystemProvider locale="en" navigate={vi.fn()}><Page bar={bar} avoid={avoid} /></DesignSystemProvider>;
    try {
      const { rerender } = render(ui(false, true));
      const region = () => screen.getByRole("region") as HTMLElement;
      // A ref with no bar behind it: the banner clears the safe area itself.
      expect(region().style.bottom).toBe("calc(var(--ds-space-200) + env(safe-area-inset-bottom, 0px))");
      rerender(ui(true, true));
      expect(region().style.bottom).toBe("calc(var(--ds-space-200) + 80px)");
      rerender(ui(false, true));
      expect(region().style.bottom).toBe("calc(var(--ds-space-200) + env(safe-area-inset-bottom, 0px))");
      rerender(ui(true, false));
      expect(region().style.bottom).toBe("calc(var(--ds-space-200) + env(safe-area-inset-bottom, 0px))");
    } finally {
      restore();
    }
  });

  it("keeps observing the bar under StrictMode's remount", () => {
    let barObservations = 0;
    const original = globalThis.ResizeObserver;
    globalThis.ResizeObserver = class {
      observe(target: Element) {
        if (target.getAttribute("data-testid") === "bar") barObservations += 1;
      }
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
    function WithBar() {
      const ref = React.useRef<HTMLDivElement>(null);
      return (
        <>
          <div ref={ref} data-testid="bar" />
          <Banner placement="floating" aria-label="Cookies" avoid={ref}>x</Banner>
        </>
      );
    }
    try {
      render(<React.StrictMode><DesignSystemProvider locale="en" navigate={vi.fn()}><WithBar /></DesignSystemProvider></React.StrictMode>);
      // Observed on mount, and again after StrictMode's simulated unmount and remount.
      expect(barObservations).toBe(2);
    } finally {
      globalThis.ResizeObserver = original;
    }
  });

  it("keeps the offset while any banner is still shown", () => {
    const rect = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      const label = this.getAttribute("aria-label");
      const top = label === "One" ? window.innerHeight - 90 : label === "Two" ? window.innerHeight - 120 : 0;
      return { top, left: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON() {} } as DOMRect;
    });
    const ui = (first: boolean, second: boolean) => (
      <DesignSystemProvider locale="en" navigate={vi.fn()}>
        {first && <Banner placement="floating" aria-label="One">a</Banner>}
        {second && <Banner placement="floating" aria-label="Two">b</Banner>}
      </DesignSystemProvider>
    );
    try {
      const { rerender } = render(ui(true, true));
      expect(document.documentElement.style.getPropertyValue(FLOATING_BANNER_OFFSET)).toBe("120px");
      rerender(ui(false, true));
      expect(document.documentElement.style.getPropertyValue(FLOATING_BANNER_OFFSET)).toBe("120px");
      rerender(ui(true, false));
      expect(document.documentElement.style.getPropertyValue(FLOATING_BANNER_OFFSET)).toBe("90px");
      rerender(ui(false, false));
      expect(document.documentElement.style.getPropertyValue(FLOATING_BANNER_OFFSET)).toBe("");
    } finally {
      rect.mockRestore();
    }
  });

  it("names the close button for the context when asked", () => {
    inProvider(<Banner placement="floating" aria-label="Cookie notice" onDismiss={() => {}} dismissLabel="Close cookie notice">x</Banner>);
    expect(screen.getByRole("button", { name: "Close cookie notice" })).toBeTruthy();
  });

  it("lifts the Fab above itself while shown, and lets it back down when it goes", () => {
    const rect = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      const top = this.getAttribute("data-placement") === "floating" ? window.innerHeight - 96 : 0;
      return { top, left: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON() {} } as DOMRect;
    });
    const ui = (shown: boolean) => (
      <DesignSystemProvider locale="en" navigate={vi.fn()}>
        <Fab label="Chat" icon="message-circle" onPress={() => {}} />
        {shown && <Consent />}
      </DesignSystemProvider>
    );
    try {
      const { rerender } = render(ui(true));
      expect(document.documentElement.style.getPropertyValue(FLOATING_BANNER_OFFSET)).toBe("96px");
      expect(classesOf(slot("fab"))).toContain("var(--ds-floating-banner-offset,0px)");
      // Stacking: the Fab is a layer above the banner.
      expect(classesOf(slot("fab"))).toContain(LAYER.fab);
      rerender(ui(false));
      expect(document.documentElement.style.getPropertyValue(FLOATING_BANNER_OFFSET)).toBe("");
    } finally {
      rect.mockRestore();
    }
  });

  it("can drop the icon for narrow layouts and keeps the tone icon by default", () => {
    inProvider(
      <>
        <Banner placement="floating" aria-label="One" icon={null}>Short.</Banner>
      </>,
    );
    expect(slot("banner-icon", screen.getByRole("region"))).toBeNull();
    cleanup();
    inProvider(<Banner placement="floating" aria-label="Two" title="Maintenance">Tomorrow 02:00–03:00.</Banner>);
    expect(slot("banner-icon", screen.getByRole("region"))?.getAttribute("data-icon")).toBe("info");
    expect(slot("banner-title", screen.getByRole("region"))?.textContent).toBe("Maintenance");
  });

  it("leaves the inline Banner as it was", () => {
    inProvider(<Banner tone="warning" title="Plan expires soon" onDismiss={() => {}}>Renew the plan.</Banner>);
    const banner = screen.getByRole("status");
    expect(banner.hasAttribute("data-placement")).toBe(false);
    expect(classesOf(banner)).not.toContain("fixed");
    // The body takes the row, so the dismiss button stays at the end.
    expect(classesOf(slot("banner-body", banner)).split(/\s+/)).toContain("flex-1");
  });

  it("keeps the layer order: sticky bars < floating banner < Fab, all under the overlays and toasts", () => {
    const order = [LAYER.stickyBar, LAYER.floatingBanner, LAYER.fab].map((layer) => Number(layer.slice(2)));
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    // The banner and the Fab take their layer from the shared scale.
    inProvider(<><Consent /><Fab label="Chat" icon="message-circle" onPress={() => {}} /></>);
    expect(classesOf(screen.getByRole("region"))).toContain(LAYER.floatingBanner);
    expect(classesOf(slot("fab"))).toContain(LAYER.fab);
    // React Aria overlays (100000) and toasts (LAYER.toast) sit far above.
    expect(order.every((z) => z < 100000)).toBe(true);
    expect(Number(/\d+/.exec(LAYER.toast)?.[0])).toBeGreaterThan(100000);
  });

  it("uses logical classes in RTL", () => {
    render(
      <DesignSystemProvider locale="ar" navigate={vi.fn()}>
        <div dir="rtl"><Consent /></div>
      </DesignSystemProvider>,
    );
    for (const part of Array.from(screen.getByRole("region").querySelectorAll("[data-slot]")).concat(screen.getByRole("region"))) {
      expect(classesOf(part), part.getAttribute("data-slot") ?? "").not.toMatch(PHYSICAL);
    }
  });
});
