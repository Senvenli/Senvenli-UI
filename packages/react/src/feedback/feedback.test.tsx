import fs from "node:fs";
import * as React from "react";
import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { createTheme, toCSS } from "@senvenli/tokens";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { DS_STRINGS, resendInLabel } from "../i18n";
import { Banner, Meter, ProgressBar, ProgressCircle, Skeleton, SkeletonCircle, SkeletonGroup, SkeletonText, Spinner, useCooldownAction } from "./index";

// A helper, not an inline `new URL("…", import.meta.url)`: Vite rewrites that literal form into an asset URL.
const here = (file: string) => new URL(file, import.meta.url);
const theme = toCSS(createTheme(), { tailwind: true }) + fs.readFileSync(here("../../styles/theme.css"), "utf8");
const PHYSICAL = /(^|\s|:)(-?m[lr]-|p[lr]-|left-|right-|border-[lr](-|\s|$)|rounded-[lr]-|text-left|text-right)/;
const classesOf = (element: Element | null) => element?.getAttribute("class") ?? "";

function inProvider(ui: React.ReactElement, locale = "en") {
  return render(<DesignSystemProvider locale={locale} navigate={vi.fn()}>{ui}</DesignSystemProvider>);
}

/** Controls prefers-reduced-motion and records Web Animations started on elements. */
let reducedMotion = false;
const started: { element: Element; keyframes: Keyframe[]; options?: KeyframeAnimationOptions }[] = [];
beforeEach(() => {
  reducedMotion = false;
  started.length = 0;
  window.matchMedia = ((query: string) => ({
    matches: query.includes("reduce") ? reducedMotion : false,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
  Element.prototype.animate = function (this: Element, keyframes: Keyframe[], options?: KeyframeAnimationOptions) {
    started.push({ element: this, keyframes, options });
    return { cancel: () => {} } as unknown as Animation;
  } as unknown as Element["animate"];
});
afterEach(cleanup);

describe("Banner", () => {
  it("interrupts for errors (alert) and waits its turn otherwise (status), with the tone's icon", () => {
    inProvider(
      <>
        <Banner tone="danger" title="Payment failed">Ask for another card.</Banner>
        <Banner tone="warning" title="Plan expires soon" />
        <Banner title="New pricing" />
        <Banner tone="success" title="Connected" />
      </>,
    );
    expect(screen.getByRole("alert").textContent).toContain("Payment failed");
    expect(screen.getAllByRole("status")).toHaveLength(3);
    const icons = Array.from(document.querySelectorAll('[data-slot="banner-icon"]')).map((icon) => icon.getAttribute("data-icon"));
    expect(icons).toEqual(["circle-x", "triangle-alert", "info", "circle-check"]);
  });

  it("offers a localized close button only when it can be dismissed", () => {
    const onDismiss = vi.fn();
    inProvider(
      <>
        <Banner title="New pricing" onDismiss={onDismiss} actions={<a href="#pricing">View pricing</a>} />
        <Banner tone="danger" title="Payment failed" />
      </>,
    );
    const close = screen.getAllByRole("button", { name: DS_STRINGS.close.en });
    expect(close).toHaveLength(1);
    fireEvent.click(close[0]);
    expect(onDismiss).toHaveBeenCalled();
    expect(document.querySelector('[data-slot="banner-actions"] a')?.textContent).toBe("View pricing");
  });

  it("uses the status tokens for every tone", () => {
    inProvider(
      <>
        {(["information", "warning", "danger", "success"] as const).map((tone) => <Banner key={tone} tone={tone} title={tone} />)}
      </>,
    );
    for (const banner of Array.from(document.querySelectorAll('[data-slot="banner"]'))) {
      for (const utility of classesOf(banner).split(/\s+/)) {
        const color = /^(?:bg|inset-ring)-(ds-[a-z-]+)$/.exec(utility);
        if (color) expect(theme, utility).toContain(`--color-${color[1]}:`);
      }
    }
  });
});

describe("ProgressBar", () => {
  it("is a named progressbar with real units as its value text", () => {
    inProvider(<ProgressBar label="Importing records" value={142} maxValue={220} valueLabel="142 / 220" />);
    const bar = screen.getByRole("progressbar", { name: "Importing records" });
    expect(bar.getAttribute("aria-valuenow")).toBe("142");
    expect(bar.getAttribute("aria-valuetext")).toBe("142 / 220");
    expect((document.querySelector('[data-slot="progress-bar-fill"]') as HTMLElement).style.width).toBe(`${(142 / 220) * 100}%`);
  });

  it("sweeps a segment when indeterminate, in the reading direction, and stops under reduced motion", () => {
    inProvider(<ProgressBar label="Preparing report" isIndeterminate />);
    expect(screen.getByRole("progressbar").hasAttribute("aria-valuenow")).toBe(false);
    // The 30% segment enters fully off the start edge and leaves fully past the end edge (100 / 30 ≈ 333%).
    expect(started.at(-1)?.keyframes).toEqual([{ transform: "translateX(-100%)" }, { transform: "translateX(333%)" }]);
    cleanup();
    started.length = 0;
    inProvider(<div dir="rtl"><ProgressBar label="ب" isIndeterminate /></div>, "ar");
    expect(started.at(-1)?.keyframes).toEqual([{ transform: "translateX(100%)" }, { transform: "translateX(-333%)" }]);
    cleanup();
    started.length = 0;
    reducedMotion = true;
    inProvider(<ProgressBar label="Report" isIndeterminate />);
    expect(started).toHaveLength(0);
  });

  it("restarts the sweep in the new direction when the locale flips while it is on screen", () => {
    const ui = (locale: string, dir: "ltr" | "rtl") => (
      <DesignSystemProvider locale={locale} navigate={vi.fn()}>
        <div dir={dir}><ProgressBar label="Report" isIndeterminate /></div>
      </DesignSystemProvider>
    );
    const { rerender } = render(ui("en", "ltr"));
    expect(started.at(-1)?.keyframes[0]).toEqual({ transform: "translateX(-100%)" });
    const sweep = started.at(-1)?.element;
    rerender(ui("ar", "rtl"));
    expect(started.at(-1)?.element).toBe(sweep);
    expect(started.at(-1)?.keyframes[0]).toEqual({ transform: "translateX(100%)" });
  });

  it("says a failed task in words and colour", () => {
    inProvider(<ProgressBar label="Sync" value={38} tone="danger" valueLabel="Stopped" />);
    const value = document.querySelector('[data-slot="progress-bar-value"]');
    expect(value?.textContent).toBe("Stopped");
    expect(classesOf(value)).toContain("text-ds-text-danger");
    expect(classesOf(document.querySelector('[data-slot="progress-bar-fill"]'))).toContain("bg-ds-background-danger-bold");
  });
});

describe("ProgressCircle", () => {
  it("is a progressbar, or a meter for a measurement, with the value inside from 48px up", () => {
    inProvider(
      <>
        <ProgressCircle value={64} aria-label="Upload" />
        <ProgressCircle size="large" value={87} label="Storage used" isMeasurement />
        <ProgressCircle size="small" value={40} aria-label="Small" />
      </>,
    );
    expect(screen.getByRole("progressbar", { name: "Upload" })).toBeTruthy();
    expect(screen.getByRole("meter", { name: "Storage used" })).toBeTruthy();
    const values = Array.from(document.querySelectorAll('[data-slot="progress-circle-value"]')).map((value) => value.textContent);
    expect(values).toHaveLength(2);
    expect(screen.getByRole("progressbar", { name: "Small" }).querySelector('[data-slot="progress-circle-value"]')).toBeNull();
  });

  it("spins at an even speed when indeterminate", () => {
    inProvider(<ProgressCircle isIndeterminate aria-label="Loading" />);
    expect(started.at(-1)?.keyframes.at(-1)).toEqual({ transform: "rotate(360deg)" });
    expect(started.at(-1)?.options?.easing).toBe("linear");
  });
});

describe("Meter", () => {
  it("is a meter that warns from 85% and says it in words", () => {
    inProvider(<Meter label="Message credits" value={460} maxValue={500} valueLabel="460 / 500 · 92%" />);
    const meter = screen.getByRole("meter", { name: "Message credits" });
    expect(meter.getAttribute("aria-valuetext")).toBe("460 / 500 · 92%");
    expect(meter.getAttribute("data-state")).toBe("warning");
    expect(classesOf(document.querySelector('[data-slot="meter-value"]'))).toContain("text-ds-text-warning");
    expect(document.querySelectorAll('[data-slot="meter-segment"][data-on]')).toHaveLength(9);
  });

  it("warns at the low end when that is the bad one (battery), with the real segment count", () => {
    inProvider(<Meter label="Battery" value={1} maxValue={8} segments={8} badEnd="low" thresholds={{ warning: 2, critical: 1 }} valueLabel="1/8 · charge soon" />);
    expect(screen.getByRole("meter").getAttribute("data-state")).toBe("critical");
    expect(document.querySelectorAll('[data-slot="meter-segment"]')).toHaveLength(8);
    expect(classesOf(document.querySelector('[data-slot="meter-segment"][data-on]'))).toContain("bg-ds-icon-danger");
  });

  it("stays normal well under the limit", () => {
    inProvider(<Meter label="Project quota" value={38} maxValue={50} />);
    expect(screen.getByRole("meter").getAttribute("data-state")).toBe("normal");
    expect(screen.getByRole("meter").getAttribute("aria-valuetext")).toBe("38 / 50");
  });

  it("never infers the direction from the thresholds: a low critical alone still means high is bad", () => {
    inProvider(<Meter label="Storage" value={60} maxValue={100} thresholds={{ critical: 50 }} />);
    expect(screen.getByRole("meter").getAttribute("data-state")).toBe("critical");
    cleanup();
    inProvider(<Meter label="Storage" value={20} maxValue={100} thresholds={{ critical: 50 }} />);
    expect(screen.getByRole("meter").getAttribute("data-state")).toBe("normal");
  });

  it("is a full battery and normal in the low mode, and warns from its threshold", () => {
    inProvider(<Meter label="Battery" value={8} maxValue={8} segments={8} badEnd="low" thresholds={{ warning: 2, critical: 1 }} />);
    expect(screen.getByRole("meter").getAttribute("data-state")).toBe("normal");
    cleanup();
    inProvider(<Meter label="Battery" value={2} maxValue={8} segments={8} badEnd="low" thresholds={{ warning: 2, critical: 1 }} />);
    expect(screen.getByRole("meter").getAttribute("data-state")).toBe("warning");
  });

  it("survives a zero maximum and out-of-range values", () => {
    inProvider(<Meter label="Empty quota" value={0} maxValue={0} />);
    expect(screen.getByRole("meter").getAttribute("data-state")).toBe("normal");
    expect(document.querySelectorAll('[data-slot="meter-segment"][data-on]')).toHaveLength(0);
    cleanup();
    inProvider(<Meter label="Overage" value={140} maxValue={100} />);
    expect(document.querySelectorAll('[data-slot="meter-segment"][data-on]')).toHaveLength(10);
    expect(screen.getByRole("meter").getAttribute("data-state")).toBe("warning");
  });
});

describe("Spinner", () => {
  it("says loading in words by default and is hidden when visible text already says it", () => {
    inProvider(
      <>
        <Spinner size="large" aria-label="Checking availability" />
        <Spinner />
        <Spinner isDecorative />
      </>,
    );
    const statuses = screen.getAllByRole("status");
    expect(statuses.map((status) => status.textContent)).toEqual(["Checking availability", DS_STRINGS.loading.en]);
    // The words are said once: content only, no aria-label repeating them.
    for (const status of statuses) expect(status.hasAttribute("aria-label")).toBe(false);
  });

  it("turns in 700ms and stops under reduced motion", () => {
    inProvider(<Spinner />);
    const ring = document.querySelector('[data-slot="spinner-ring"]');
    expect(classesOf(ring)).toContain("[animation-duration:700ms]");
    expect(classesOf(ring)).toContain("motion-reduce:animate-none");
  });
});

describe("Skeleton", () => {
  it("holds its space but appears only after 300ms, then shimmers", () => {
    vi.useFakeTimers();
    inProvider(<Skeleton width="60%" />);
    const shape = document.querySelector('[data-slot="skeleton"]') as HTMLElement;
    expect(shape.style.width).toBe("60%");
    expect(classesOf(shape)).toContain("opacity-0");
    act(() => vi.advanceTimersByTime(300));
    expect(classesOf(shape)).toContain("opacity-100");
    expect(started.some((entry) => entry.element === shape)).toBe(true);
    vi.useRealTimers();
  });

  it("does not shimmer under reduced motion", () => {
    reducedMotion = true;
    inProvider(<SkeletonCircle size={32} delay={0} />);
    expect(started).toHaveLength(0);
  });

  it("swaps in the real content when loaded, and marks the region busy while loading", () => {
    const { rerender } = inProvider(
      <SkeletonGroup label="Loading orders" isLoading>
        <SkeletonText lines={3} delay={0} />
      </SkeletonGroup>,
    );
    const group = screen.getByRole("group", { name: "Loading orders" });
    expect(group.getAttribute("aria-busy")).toBe("true");
    expect(document.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(3);
    rerender(
      <DesignSystemProvider locale="en" navigate={vi.fn()}>
        <SkeletonGroup label="Loading orders" isLoading={false}>
          <SkeletonText lines={3} isLoaded>
            <p>Order 482</p>
          </SkeletonText>
        </SkeletonGroup>
      </DesignSystemProvider>,
    );
    // Loaded: no busy state and no stale "loading" name.
    expect(document.querySelector('[data-slot="skeleton-group"]')?.hasAttribute("aria-busy")).toBe(false);
    expect(screen.queryByRole("group", { name: "Loading orders" })).toBeNull();
    expect(screen.getByText("Order 482")).toBeTruthy();
  });

  it("names the loaded region only when asked", () => {
    inProvider(
      <SkeletonGroup label="Loading orders" loadedLabel="Orders" isLoading={false}>
        <p>Order 482</p>
      </SkeletonGroup>,
    );
    expect(screen.getByRole("group", { name: "Orders" }).hasAttribute("aria-busy")).toBe(false);
  });

  it("appears at once when the delay drops to zero", () => {
    vi.useFakeTimers();
    const { rerender } = inProvider(<Skeleton delay={5000} />);
    const shape = () => document.querySelector('[data-slot="skeleton"]') as HTMLElement;
    expect(classesOf(shape())).toContain("opacity-0");
    rerender(<DesignSystemProvider locale="en" navigate={vi.fn()}><Skeleton delay={0} /></DesignSystemProvider>);
    expect(classesOf(shape())).toContain("opacity-100");
    vi.useRealTimers();
  });
});

describe("the resend cooldown", () => {
  it("does not start the wait when the resend is rejected, handles the rejection and reports it as failed", async () => {
    const unhandled = vi.fn();
    process.on("unhandledRejection", unhandled);
    const onResend = vi.fn().mockRejectedValue(new Error("The provider did not respond"));
    const { result } = renderHook(() => useCooldownAction(onResend, 60));
    let ran = true;
    await act(async () => {
      ran = await result.current.run();
    });
    expect(onResend).toHaveBeenCalledTimes(1);
    expect(ran).toBe(false);
    expect(result.current.failed).toBe(true);
    expect(result.current.isPending).toBe(false);
    expect(result.current.remaining).toBe(0);
    await new Promise((resolve) => setTimeout(resolve, 0));
    process.off("unhandledRejection", unhandled);
    expect(unhandled).not.toHaveBeenCalled();
  });

  it("starts the wait only after the resend succeeds", async () => {
    vi.useFakeTimers();
    let finish: () => void = () => {};
    const onResend = vi.fn(() => new Promise<void>((resolve) => {
      finish = resolve;
    }));
    // A code was just sent: the first wait is already running.
    const { result } = renderHook(() => useCooldownAction(onResend, 30, 30));
    for (let second = 0; second < 30; second++) act(() => vi.advanceTimersByTime(1000));
    expect(result.current.remaining).toBe(0);
    act(() => {
      void result.current.run();
    });
    // Pending: not available again, but no countdown yet.
    expect(result.current.isPending).toBe(true);
    expect(result.current.remaining).toBe(0);
    await act(async () => finish());
    expect(result.current.isPending).toBe(false);
    expect(result.current.failed).toBe(false);
    expect(result.current.remaining).toBe(30);
    expect(resendInLabel("en", result.current.remaining)).toBe(DS_STRINGS.resendIn.en.replace("{time}", "0:30"));
    vi.useRealTimers();
  });

  it("restarts the wait when the parent passes a new cooldown (server retry-after)", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ cooldown }) => useCooldownAction(vi.fn(), cooldown, cooldown), { initialProps: { cooldown: 30 } });
    for (let second = 0; second < 30; second++) act(() => vi.advanceTimersByTime(1000));
    expect(result.current.remaining).toBe(0);
    rerender({ cooldown: 90 });
    expect(result.current.remaining).toBe(90);
    expect(resendInLabel("en", result.current.remaining)).toBe(DS_STRINGS.resendIn.en.replace("{time}", "1:30"));
    vi.useRealTimers();
  });
});

describe("useCooldownAction", () => {
  it("runs once while a run is pending and not at all during the wait", async () => {
    vi.useFakeTimers();
    let finish: () => void = () => {};
    const action = vi.fn(() => new Promise<void>((resolve) => {
      finish = resolve;
    }));
    const { result } = renderHook(() => useCooldownAction(action, 10));
    let first: Promise<boolean> = Promise.resolve(false);
    let second: Promise<boolean> = Promise.resolve(false);
    act(() => {
      first = result.current.run();
      second = result.current.run();
    });
    expect(await second).toBe(false);
    await act(async () => finish());
    expect(await first).toBe(true);
    expect(action).toHaveBeenCalledTimes(1);
    expect(result.current.remaining).toBe(10);
    let during = true;
    await act(async () => {
      during = await result.current.run();
    });
    expect(during).toBe(false);
    expect(action).toHaveBeenCalledTimes(1);
    for (let second = 0; second < 10; second++) act(() => vi.advanceTimersByTime(1000));
    expect(result.current.remaining).toBe(0);
    vi.useRealTimers();
  });

  it("reports a throw as failed without starting the wait, and clears it on the next run", async () => {
    const action = vi.fn().mockImplementationOnce(() => {
      throw new Error("x");
    }).mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useCooldownAction(action, 5));
    await act(async () => {
      await result.current.run();
    });
    expect(result.current.failed).toBe(true);
    expect(result.current.remaining).toBe(0);
    await act(async () => {
      await result.current.run();
    });
    expect(result.current.failed).toBe(false);
    expect(result.current.remaining).toBe(5);
  });

  it("does nothing without an action", async () => {
    const { result } = renderHook(() => useCooldownAction(undefined, 5));
    let ran = true;
    await act(async () => {
      ran = await result.current.run();
    });
    expect(ran).toBe(false);
  });
});

describe("keyboard", () => {
  it("dismisses a banner from the keyboard", () => {
    const onDismiss = vi.fn();
    inProvider(<Banner title="New pricing" onDismiss={onDismiss} />);
    const pressEnter = (element: HTMLElement) => {
      act(() => element.focus());
      expect(document.activeElement).toBe(element);
      fireEvent.keyDown(element, { key: "Enter" });
      fireEvent.keyUp(element, { key: "Enter" });
    };
    const close = screen.getByRole("button", { name: DS_STRINGS.close.en });
    expect(close.getAttribute("data-slot")).toBe("banner-dismiss");
    expect(close.tabIndex).toBe(0);
    pressEnter(close);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
