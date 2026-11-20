import fs from "node:fs";
import * as React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createTheme, toCSS } from "@senvenli/tokens";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { Button } from "../action/index";
import { DS_STRINGS, registerDsStrings } from "../i18n";
import { EmptyState, ErrorState, StatusDot } from "./index";

// A helper, not an inline `new URL("…", import.meta.url)`: Vite rewrites that literal form into an asset URL.
const here = (file: string) => new URL(file, import.meta.url);
const theme = toCSS(createTheme(), { tailwind: true }) + fs.readFileSync(here("../../styles/theme.css"), "utf8");
const PHYSICAL = /(^|\s|:)(-?m[lr]-|p[lr]-|left-|right-|border-[lr](-|\s|$)|rounded-[lr]-|text-left|text-right)/;
const classesOf = (element: Element | null) => element?.getAttribute("class") ?? "";
const slot = (name: string) => document.querySelector(`[data-slot="${name}"]`);

function inProvider(ui: React.ReactElement, locale = "en") {
  return render(<DesignSystemProvider locale={locale} navigate={vi.fn()}>{ui}</DesignSystemProvider>);
}

/** Every ds colour utility on the element resolves to a theme token. */
function expectTokens(element: Element | null) {
  for (const utility of classesOf(element).split(/\s+/)) {
    const color = /^(?:bg|text|ring)-(ds-(?:background|surface|icon|text|border)[a-z-]*)$/.exec(utility);
    if (color) expect(theme, utility).toContain(`--color-${color[1]}:`);
  }
}

afterEach(cleanup);

describe("EmptyState", () => {
  it("shows one icon, the title, the reason and the actions that fill the view", () => {
    const create = vi.fn();
    inProvider(
      <EmptyState
        icon="calendar-plus"
        title="No orders yet"
        description="Orders are listed here as they come in from your site and other channels."
        primaryAction={<Button variant="primary" iconBefore="plus" onPress={create}>Create order</Button>}
        secondaryAction={<Button variant="subtle">Open site</Button>}
      />,
    );
    expect(slot("empty-state-icon")?.querySelectorAll("svg")).toHaveLength(1);
    expect(slot("empty-state-icon")?.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    expect(classesOf(slot("empty-state-title"))).toContain("text-heading-small");
    expect(classesOf(slot("empty-state-description"))).toContain("text-ds-text-subtle");
    const buttons = Array.from(slot("empty-state-actions")?.querySelectorAll("button") ?? []).map((button) => button.textContent);
    expect(buttons).toEqual(["Create order", "Open site"]);
    fireEvent.click(screen.getByRole("button", { name: "Create order" }));
    expect(create).toHaveBeenCalled();
    // Calm by design: no live announcement for an empty view.
    expect(slot("empty-state")?.hasAttribute("role")).toBe(false);
  });

  it("has a compact size for tables and cards", () => {
    inProvider(<EmptyState size="compact" icon="search-x" title="No items match “ZZ-9”" description="Check the code or clear the filters." />);
    expect(slot("empty-state")?.getAttribute("data-size")).toBe("compact");
    expect(classesOf(slot("empty-state"))).toContain("py-ds-300");
    expect(classesOf(slot("empty-state-title"))).toContain("text-body-strong");
    expect(classesOf(slot("empty-state-description"))).toContain("text-body-small");
    expect(slot("empty-state-actions")).toBeNull();
  });

  it("renders the title as a heading when asked, and no empty description", () => {
    inProvider(<EmptyState icon="inbox" title="Nothing due today" headingLevel={2} description={null} />);
    expect(screen.getByRole("heading", { level: 2, name: "Nothing due today" })).toBeTruthy();
    expect(slot("empty-state-description")).toBeNull();
  });

  it("uses only theme tokens on the tile", () => {
    inProvider(<EmptyState icon="inbox" title="Nothing due today" />);
    expectTokens(slot("empty-state-icon"));
    expect(classesOf(slot("empty-state-icon"))).toContain("bg-ds-surface-sunken");
  });
});

describe("ErrorState", () => {
  it("is an alert that says what failed, what to do, and the code with the time for support", () => {
    inProvider(
      <ErrorState
        title="Reports could not be loaded"
        description="The server could not be reached. Check your connection and try again."
        errorCode="RPT-504"
        occurredAt={new Date(2026, 9, 8, 11, 42)}
        onRetry={() => {}}
      />,
    );
    const alert = screen.getByRole("alert");
    expect(alert.getAttribute("data-slot")).toBe("error-state-message");
    expect(alert.textContent).toContain("Reports could not be loaded");
    expect(alert.textContent).toContain("The server could not be reached");
    // The actions sit outside the announced message, so pressing retry does not re-read it.
    expect(alert.contains(screen.getByRole("button", { name: DS_STRINGS.retry.en }))).toBe(false);
    const code = slot("error-state-code")?.textContent ?? "";
    expect(code.startsWith("Error code: RPT-504 · ")).toBe(true);
    expect(code).toContain("11:42");
    expect(classesOf(slot("error-state-code"))).toContain("font-ds-mono");
    // Isolated from the page direction, so RTL does not reorder the code and the time.
    expect(Array.from(slot("error-state-code")?.querySelectorAll("bdi") ?? []).map((part) => part.textContent?.includes("11:42") || part.textContent)).toEqual(["RPT-504", true]);
    expect(slot("error-state-icon")?.querySelector("svg")?.getAttribute("data-icon")).toBe("cloud-off");
    expect(classesOf(slot("error-state-icon"))).toContain("bg-ds-background-danger");
    expectTokens(slot("error-state-icon"));
  });

  it("retries from the keyboard, busy while it runs, and says so when the retry fails", async () => {
    let finish: (value?: unknown) => void = () => {};
    const onRetry = vi.fn(() => new Promise((_, reject) => {
      finish = reject;
    }));
    inProvider(<ErrorState title="Reports could not be loaded" description="Try again." onRetry={onRetry} />);
    const alertText = screen.getByRole("alert").textContent;
    const retry = screen.getByRole("button", { name: DS_STRINGS.retry.en });
    expect(retry.getAttribute("data-slot")).toBe("error-state-retry");
    act(() => retry.focus());
    expect(document.activeElement).toBe(retry);
    fireEvent.keyDown(retry, { key: "Enter" });
    fireEvent.keyUp(retry, { key: "Enter" });
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(retry.hasAttribute("data-pending")).toBe(true);
    expect(screen.getByRole("alert").textContent).toBe(alertText);
    // A second press while busy does not run it again.
    fireEvent.keyDown(retry, { key: "Enter" });
    fireEvent.keyUp(retry, { key: "Enter" });
    expect(onRetry).toHaveBeenCalledTimes(1);
    await act(async () => finish(new Error("504")));
    expect(retry.hasAttribute("data-pending")).toBe(false);
    expect(slot("error-state-retry-status")?.textContent).toBe(DS_STRINGS.actionFailed.en);
    expect(slot("error-state-retry-status")?.getAttribute("role")).toBe("status");
    expect(screen.getByRole("alert").textContent).toBe(alertText);
  });

  it("can unmount while a retry runs (the parent swaps in the loaded content)", async () => {
    let finish: () => void = () => {};
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const onRetry = vi.fn(() => new Promise<void>((resolve) => {
      finish = resolve;
    }));
    const { unmount } = inProvider(<ErrorState title="Reports could not be loaded" description="Try again." onRetry={onRetry} />);
    fireEvent.click(screen.getByRole("button", { name: DS_STRINGS.retry.en }));
    unmount();
    await act(async () => finish());
    expect(errors).not.toHaveBeenCalled();
    errors.mockRestore();
  });

  it("keeps the empty retry status in the accessibility tree without taking space", () => {
    inProvider(<ErrorState title="Reports could not be loaded" description="Try again." onRetry={() => {}} />);
    const status = slot("error-state-retry-status");
    expect(status?.textContent).toBe("");
    expect(classesOf(status)).toContain("empty:absolute");
    expect(classesOf(status)).not.toMatch(/(^|\s)(hidden|empty:hidden)(\s|$)/);
  });

  it("gives the way forward instead of a retry when retrying will not help", () => {
    inProvider(
      <ErrorState
        kind="not-allowed"
        size="compact"
        title="You do not have access to this page"
        description="Settings are open to admins only. Ask the account owner for access."
        action={<Button size="compact" variant="subtle">Back to dashboard</Button>}
      />,
    );
    expect(screen.queryByRole("button", { name: DS_STRINGS.retry.en })).toBeNull();
    // Not allowed is usually the page itself: shown, not shouted.
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("button", { name: "Back to dashboard" })).toBeTruthy();
    expect(slot("error-state-icon")?.querySelector("svg")?.getAttribute("data-icon")).toBe("lock");
    expect(slot("error-state")?.getAttribute("data-size")).toBe("compact");
    expect(slot("error-state-code")).toBeNull();
  });

  it("announces any kind when asked, and renders a heading where it is the page", () => {
    inProvider(<ErrorState kind="not-found" announce headingLevel={2} title="Item not found" description="It may have been deleted." action={<Button>Back to items</Button>} />);
    expect(screen.getByRole("alert").textContent).toContain("Item not found");
    expect(screen.getByRole("heading", { level: 2, name: "Item not found" })).toBeTruthy();
  });

  it("always offers a way forward (types)", () => {
    // @ts-expect-error -- neither onRetry nor action: no way forward.
    const none = <ErrorState title="Reports could not be loaded" description="Try again." />;
    // @ts-expect-error -- not both.
    const both = <ErrorState title="x" description="y" onRetry={() => {}} action={<Button>z</Button>} />;
    expect([none, both]).toHaveLength(2);
  });

  it("has a not-found kind and a compact retry", () => {
    inProvider(<ErrorState kind="not-found" size="compact" title="Item not found" description="It may have been deleted." onRetry={() => {}} />);
    expect(slot("error-state-icon")?.querySelector("svg")?.getAttribute("data-icon")).toBe("file-question");
    expect(screen.getByRole("button", { name: DS_STRINGS.retry.en }).getAttribute("data-size")).toBe("compact");
  });
});

describe("StatusDot", () => {
  it("is a dot and a word, the dot hidden from screen readers", () => {
    inProvider(
      <>
        <StatusDot tone="success" isLive>Online</StatusDot>
        <StatusDot tone="danger">No connection</StatusDot>
        <StatusDot>Inactive</StatusDot>
      </>,
    );
    const dots = Array.from(document.querySelectorAll('[data-slot="status-dot"]'));
    expect(dots.map((dot) => dot.textContent)).toEqual(["Online", "No connection", "Inactive"]);
    for (const mark of Array.from(document.querySelectorAll('[data-slot="status-dot-mark"]'))) {
      expect(mark.getAttribute("aria-hidden")).toBe("true");
      expect(classesOf(mark)).toContain("size-ds-100");
      expectTokens(mark);
    }
    expect(dots[2].getAttribute("data-tone")).toBe("neutral");
  });

  it("shows the halo only for a live state, in the tone's status background", () => {
    inProvider(
      <>
        <StatusDot tone="success" isLive>Online</StatusDot>
        <StatusDot tone="information">Syncing</StatusDot>
      </>,
    );
    const [live, idle] = Array.from(document.querySelectorAll('[data-slot="status-dot-mark"]'));
    expect(classesOf(live)).toContain("ring-3");
    expect(classesOf(live)).toContain("ring-ds-background-success");
    expect(classesOf(live)).toContain("bg-ds-icon-success");
    expect(classesOf(idle)).not.toContain("ring-3");
    expect(document.querySelectorAll('[data-live]')).toHaveLength(1);
  });

  it("is a named image when no word fits", () => {
    inProvider(<StatusDot tone="warning" aria-label="Signal delayed" />);
    expect(screen.getByRole("img", { name: "Signal delayed" })).toBeTruthy();
  });

  it("never renders an empty word next to the dot", () => {
    inProvider(<StatusDot tone="success">{null}</StatusDot>);
    expect(slot("status-dot-label")).toBeNull();
    // No word and no label: decorative, never an unnamed image.
    expect(slot("status-dot")?.hasAttribute("role")).toBe(false);
    expect(slot("status-dot")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("keeps the word clear of the live halo", () => {
    inProvider(
      <>
        <StatusDot tone="success" isLive>Online</StatusDot>
        <StatusDot tone="success">Online</StatusDot>
      </>,
    );
    const [live, idle] = Array.from(document.querySelectorAll('[data-slot="status-dot"]'));
    expect(classesOf(live)).toContain("gap-ds-100");
    expect(classesOf(idle)).toContain("gap-ds-075");
  });
});

describe("strings and direction", () => {
  it("ships the retry and error-code strings in English, takes a registered language and falls back to English", () => {
    expect(DS_STRINGS.retry.en).toBeTruthy();
    expect(DS_STRINGS.errorCode.en).toContain("{code}");
    registerDsStrings("de", { retry: "Erneut versuchen", errorCode: "Fehlercode: {code}" });
    // A regional tag uses its language's strings; a language nobody registered gets English.
    for (const [locale, retry, code] of [["de", "Erneut versuchen", "Fehlercode: X-1"], ["de-AT", "Erneut versuchen", "Fehlercode: X-1"], ["en", DS_STRINGS.retry.en, "Error code: X-1"], ["nl", DS_STRINGS.retry.en, "Error code: X-1"]] as const) {
      inProvider(<ErrorState title="Reports could not be loaded" description="Check your connection." errorCode="X-1" onRetry={() => {}} />, locale);
      expect(screen.getByRole("button", { name: retry }), locale).toBeTruthy();
      expect(slot("error-state-code")?.textContent, locale).toBe(code);
      cleanup();
    }
  });

  it("renders every part with logical classes and centred in RTL", () => {
    const { container } = inProvider(
      <div dir="rtl">
        <EmptyState icon="inbox" title="ا" description="ب" primaryAction={<Button>ج</Button>} />
        <ErrorState title="د" description="ه" errorCode="X-1" onRetry={() => {}} />
        <StatusDot tone="success" isLive>و</StatusDot>
      </div>,
      "ar",
    );
    const parts = Array.from(container.querySelectorAll("[data-slot]"));
    expect(parts.length).toBeGreaterThan(12);
    for (const part of parts) expect(classesOf(part), part.getAttribute("data-slot") ?? "").not.toMatch(PHYSICAL);
    expect(classesOf(slot("empty-state"))).toContain("text-center");
    // The code stays one isolated run inside the RTL page, and the retry icon leads in logical order.
    expect(container.querySelector('[data-slot="error-state-code-value"]')?.tagName).toBe("BDI");
    expect(container.querySelector('[data-slot="error-state-code-value"]')?.textContent).toBe("X-1");
    expect(container.querySelector('[data-slot="error-state-retry"] [data-slot="button-content"]')?.firstElementChild?.getAttribute("data-slot")).toBe("button-icon");
  });
});

describe("page-level states", () => {
  it("a state that is the whole page takes the page's h1", () => {
    inProvider(<ErrorState kind="not-found" headingLevel={1} title="Page not found" description="Go back to the home page." action={<span>Home</span>} />);
    expect(screen.getByRole("heading", { level: 1, name: "Page not found" })).toBeTruthy();
  });
});
