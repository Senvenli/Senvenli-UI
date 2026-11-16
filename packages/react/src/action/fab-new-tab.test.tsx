import * as React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DesignSystemProvider } from "../provider";
import { DS_STRINGS } from "../i18n";
import { Fab } from "./index";

const originalMatchMedia = window.matchMedia;
afterEach(() => {
  cleanup();
  window.matchMedia = originalMatchMedia;
  Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
});

function inProvider(ui: React.ReactElement, navigate = vi.fn()) {
  return render(<DesignSystemProvider locale="en" navigate={navigate}>{ui}</DesignSystemProvider>);
}

const HELP_URL = "https://example.com/help";
const NEW_TAB = DS_STRINGS.newTab.en;

describe("Fab href opens in a new tab", () => {
  it("opens its href in a new tab by default, safely, and says so", () => {
    inProvider(<Fab placement="inline" icon="message-circle" label="Chat with us" href={HELP_URL} />);
    const link = screen.getByRole("link", { name: `Chat with us ${NEW_TAB}` });
    expect(link.getAttribute("href")).toBe(HELP_URL);
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    expect(link.querySelector('[data-slot="fab-label"]')!.textContent).toBe("Chat with us");
  });

  it("stays in the page with target _self: no new tab, no forced rel, no new-tab words, the host router", () => {
    const navigate = vi.fn();
    inProvider(<Fab placement="inline" icon="calendar-plus" label="Create invoice" href="/invoices/new" target="_self" />, navigate);
    const link = screen.getByRole("link", { name: "Create invoice" });
    expect(link.getAttribute("target")).not.toBe("_blank");
    expect(link.hasAttribute("rel")).toBe(false);
    expect(link.hasAttribute("aria-label")).toBe(false);
    fireEvent.click(link);
    expect(navigate).toHaveBeenCalledWith("/invoices/new", undefined);
  });

  it("keeps the new-tab words in the name once collapsed to icon-only", () => {
    const media = { matches: true, addEventListener: () => {}, removeEventListener: () => {} };
    window.matchMedia = vi.fn(() => media) as unknown as typeof window.matchMedia;
    inProvider(<Fab icon="message-circle" label="Chat with us" href={HELP_URL} />);
    act(() => {
      Object.defineProperty(window, "scrollY", { value: 120, configurable: true });
      window.dispatchEvent(new Event("scroll"));
    });
    const link = screen.getByRole("link", { name: `Chat with us ${NEW_TAB}` });
    expect(link.getAttribute("data-collapsed")).toBe("true");
    expect(link.getAttribute("target")).toBe("_blank");
  });

  it("an action Fab without href gets no target or rel", () => {
    inProvider(<Fab placement="inline" icon="calendar-plus" label="Create invoice" onPress={() => {}} />);
    const button = screen.getByRole("button", { name: "Create invoice" });
    expect(button.hasAttribute("target")).toBe(false);
    expect(button.hasAttribute("rel")).toBe(false);
  });
});
