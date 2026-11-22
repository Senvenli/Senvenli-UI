import fs from "node:fs";
import * as React from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createTheme, toCSS } from "@senvenli/tokens";
import { Button } from "../action/index";
import { DS_STRINGS, registerDsStrings } from "../i18n";
import { DesignSystemProvider } from "../provider";
import { DescriptionList, Heading, Prose, Stat, StatGroup, Text, Timeline } from "./index";

const here = (file: string) => new URL(file, import.meta.url);
const theme = toCSS(createTheme(), { tailwind: true }) + fs.readFileSync(here("../../styles/theme.css"), "utf8");
const PHYSICAL = /(^|\s|:)(-?m[lr]-|p[lr]-|-?left-|-?right-|border-[lr](-|\s|$)|rounded-[lr]-|text-left|text-right)/;
const classesOf = (element: Element | null | undefined) => element?.getAttribute("class") ?? "";
const slot = (name: string, root: ParentNode = document) => root.querySelector(`[data-slot="${name}"]`);
const slots = (name: string, root: ParentNode = document) => Array.from(root.querySelectorAll(`[data-slot="${name}"]`));

function inLocale(ui: React.ReactElement, locale = "en", navigate = vi.fn()) {
  return render(<DesignSystemProvider locale={locale} navigate={navigate}>{ui}</DesignSystemProvider>);
}

/** Every ds utility on the element resolves to a theme token. */
function expectTokens(element: Element | null | undefined) {
  for (const utility of classesOf(element).split(/\s+/)) {
    const color = /(?:^|:)(?:bg|text|border|fill|stroke|inset-ring)-(ds-(?:background|surface|icon|text|border|chart|link)[a-z0-9-]*)$/.exec(utility);
    if (color) expect(theme, utility).toContain(`--color-${color[1]}:`);
    const type = /(?:^|:)text-((?:heading|body|display|metric)-[a-z-]+|code)$/.exec(utility);
    if (type) expect(theme, utility).toContain(`--text-${type[1]}:`);
  }
}

afterEach(cleanup);

describe("Heading and Text", () => {
  it("sets the outline level and the look separately, and wraps headings balanced", () => {
    inLocale(
      <>
        <Heading level={2} size="heading-small">Pay on delivery</Heading>
        <Heading level={1} size="display-large">Your products, your brand, one screen</Heading>
        <Heading level={3}>Default</Heading>
      </>,
    );
    const small = screen.getByRole("heading", { level: 2, name: "Pay on delivery" });
    expect(classesOf(small)).toContain("text-heading-small");
    expect(classesOf(small)).toContain("text-balance");
    const display = screen.getByRole("heading", { level: 1 });
    // Display steps down by width: heading-xxlarge, then display-medium from 480px, display-large from 768px.
    expect(classesOf(display).split(/\s+/)).toEqual(expect.arrayContaining(["text-heading-xxlarge", "min-[480px]:text-display-medium", "min-[768px]:text-display-large"]));
    expect(screen.getByRole("heading", { level: 3 }).getAttribute("data-size")).toBe("heading-medium");
    for (const heading of screen.getAllByRole("heading")) expectTokens(heading);
  });

  it("has size, tone, weight and a paragraph measure", () => {
    inLocale(
      <>
        <Text elementType="p" tone="subtle">Orders come in from your website.</Text>
        <Text size="body-small" tone="danger" weight="medium" isNumeric>$300</Text>
        <Text size="code">ORD-2026-10-0914</Text>
      </>,
    );
    const [paragraph, amount, code] = slots("text");
    expect(paragraph!.tagName).toBe("P");
    expect(classesOf(paragraph)).toContain("max-w-[70ch]");
    // The heaviest weight is medium.
    expect(classesOf(amount).split(/\s+/)).toEqual(expect.arrayContaining(["text-body-small", "text-ds-text-danger", "font-medium", "tabular-nums"]));
    expect(classesOf(amount)).not.toContain("font-semibold");
    expect(classesOf(paragraph)).not.toContain("font-medium");
    expect(classesOf(code)).toContain("font-ds-mono");
    for (const text of slots("text")) expectTokens(text);
  });
});

describe("Prose", () => {
  it("styles long-form children at a 62ch measure from the type tokens", () => {
    inLocale(
      <Prose>
        <h2>Cancellation and refunds</h2>
        <p>Orders cancelled up to 48 hours before dispatch are refunded in full.</p>
        <ul><li>A hold of <strong>$300</strong> is placed on your card.</li><li>Cash in store only.</li></ul>
        <blockquote>Items ship fully assembled.</blockquote>
        <p>Quote your number (<code>ORD-2026-10-0914</code>).</p>
      </Prose>,
    );
    const prose = slot("prose");
    const classes = classesOf(prose).split(/\s+/);
    expect(classes).toEqual(expect.arrayContaining([
      "max-w-[62ch]", "text-body-large", "[&_h2]:text-heading-medium", "[&_h2]:text-balance", "[&_h3]:text-heading-small",
      "[&_ul]:ps-ds-250", "[&_blockquote]:border-s-2", "[&_blockquote]:border-ds-border-bold", "[&_code]:bg-ds-background-neutral",
    ]));
    expect(screen.getByRole("heading", { level: 2 })).toBeTruthy();
    expect(screen.getByRole("list")).toBeTruthy();
    expectTokens(prose);
  });
});

describe("Stat", () => {
  it("shows the label, a tabular value, and the change in words for screen readers", () => {
    inLocale(
      <StatGroup aria-label="This month's summary">
        <Stat label="Revenue this month" value="$48,920" delta={{ value: "12.4%", direction: "up", isPositive: true }} comparison="vs. September" trend={[3, 4, 3.5, 6, 5.5, 8, 7.5, 10, 11]} />
        <Stat label="Returns" value="3" delta={{ value: "2", direction: "down", isPositive: true }} comparison="vs. last month" />
        <Stat label="Stock in use" value="87.4%" delta={{ value: "3.1%", direction: "down", isPositive: false }} comparison="vs. last week" />
        <Stat label="Due today" value="14" comparison="2 overdue" />
      </StatGroup>,
    );
    const group = screen.getByRole("group", { name: "This month's summary" });
    const [revenue, returned, usage, due] = slots("stat", group);
    expect(classesOf(slot("stat-value", revenue))).toContain("tabular-nums");
    expect(classesOf(slot("stat-value", revenue))).toContain("text-metric-large");
    const delta = slot("stat-delta", revenue) as HTMLElement;
    expect(DS_STRINGS.deltaUp.en.replace("{value}", "12.4%")).toBe("up 12.4%");
    expect(within(delta).getByText("up 12.4%").getAttribute("class")).toContain("sr-only");
    expect(delta.querySelector("svg")?.getAttribute("data-icon")).toBe("arrow-up-right");
    expect(classesOf(delta)).toContain("text-ds-text-success");
    // The change is medium weight, never semibold.
    expect(classesOf(delta).split(/\s+/)).toEqual(expect.arrayContaining(["text-body-small", "font-medium", "tabular-nums"]));
    expect(classesOf(delta)).not.toContain("font-semibold");
    // Colour follows meaning: fewer returns is good even though it goes down.
    expect(classesOf(slot("stat-delta", returned))).toContain("text-ds-text-success");
    expect(slot("stat-delta", returned)?.querySelector("svg")?.getAttribute("data-icon")).toBe("arrow-down-right");
    expect(within(slot("stat-delta", returned) as HTMLElement).getByText("down 2")).toBeTruthy();
    expect(classesOf(slot("stat-delta", usage))).toContain("text-ds-text-danger");
    expect(slot("stat-delta", due)).toBeNull();
    expect(slot("stat-change", revenue)).toBeTruthy();
    expect(slot("stat-comparison", revenue)?.textContent).toBe("vs. September");
    // The label is sentence case as written (no CSS uppercase), in body-small medium, and carries the content language.
    const label = slot("stat-label", revenue);
    expect(label?.textContent).toBe("Revenue this month");
    expect(classesOf(label).split(/\s+/)).toEqual(expect.arrayContaining(["text-body-small", "font-medium"]));
    expect(classesOf(label)).not.toMatch(/uppercase|text-heading-xxsmall/);
    expect(label?.getAttribute("lang")).toBe("en");
    const spark = slot("stat-sparkline", revenue);
    expect(spark?.getAttribute("aria-hidden")).toBe("true");
    expect(spark?.querySelectorAll("path")).toHaveLength(2);
    for (const stat of slots("stat")) expectTokens(stat);
    expectTokens(label);
    expectTokens(spark?.querySelectorAll("path")[1]);
  });

  it("reads up as good and down as bad unless told otherwise", () => {
    inLocale(
      <>
        <Stat label="Revenue" value="1" delta={{ value: "5%", direction: "up" }} />
        <Stat label="Stock in use" value="2" delta={{ value: "3%", direction: "down" }} />
      </>,
    );
    const [up, down] = slots("stat-delta");
    expect(classesOf(up)).toContain("text-ds-text-success");
    expect(classesOf(down)).toContain("text-ds-text-danger");
  });

  it("is one link to its report when it has an href, named by label and figure, reachable by keyboard", () => {
    const navigate = vi.fn();
    inLocale(<Stat label="Revenue this month" value="$48,920" delta={{ value: "12.4%", direction: "up" }} comparison="vs. September" href="/reports/revenue" />, "en", navigate);
    const link = screen.getByRole("link", { name: "Revenue this month $48,920" });
    expect(link.getAttribute("aria-describedby")).toBe(slot("stat-change", link)?.id);
    act(() => link.focus());
    expect(document.activeElement).toBe(link);
    expect(classesOf(link)).toContain("data-[focus-visible]:inset-ring-2");
    fireEvent.click(link);
    expect(navigate).toHaveBeenCalledWith("/reports/revenue", undefined);
  });

  it("says no change with a level dash and keeps the figure", () => {
    inLocale(<Stat label="Average order" value="4.2 items" delta={{ value: "0%", direction: "flat" }} comparison="vs. September" />);
    const delta = slot("stat-delta") as HTMLElement;
    expect(delta.querySelector("svg")?.getAttribute("data-icon")).toBe("minus");
    expect(delta.querySelector("bdi")?.textContent).toBe("0%");
    expect(delta.textContent).toContain(DS_STRINGS.noChange.en);
    expect(classesOf(delta)).toContain("text-ds-text-subtle");
  });

  it("puts at most four in a row and does not stretch fewer", () => {
    inLocale(<StatGroup><Stat label="a" value="1" /></StatGroup>);
    const classes = classesOf(slot("stat-group"));
    expect(classes).toContain("auto-fill");
    expect(classes).toContain("_/_4");
  });
});

describe("DescriptionList", () => {
  const items = [
    { label: "Order", value: "ORD-2026-10-0914", copyValue: "ORD-2026-10-0914" },
    { label: "Total", value: "$248.00" },
    { label: "Note", value: "" },
    { label: "Customer", value: "Ada Lovelace", action: <Button variant="link" size="small">Edit</Button> },
  ];
  const copyName = DS_STRINGS.copyValue.en.replace("{label}", "Order");

  it("is a dl of dt/dd pairs with tabular values, rules between rows, and a dash for empty values", () => {
    inLocale(<DescriptionList items={items} />);
    const list = slot("description-list") as HTMLElement;
    expect(list.tagName).toBe("DL");
    expect(list.querySelectorAll(":scope > div > dt")).toHaveLength(4);
    expect(list.querySelectorAll(":scope > div > dd")).toHaveLength(4);
    expect(classesOf(list)).toContain("@min-[480px]:grid-cols-[minmax(120px,180px)_1fr]");
    // A rule between rows, not above the first; a gutter between label and value.
    for (const item of slots("description-list-item")) expect(classesOf(item).split(/\s+/)).toEqual(expect.arrayContaining(["border-t", "first:border-t-0", "@min-[480px]:gap-x-ds-200"]));
    expect(classesOf(list)).toContain("@min-[480px]:gap-x-ds-200");
    for (const value of slots("description-list-value")) expect(classesOf(value)).toContain("tabular-nums");
    const empty = slot("description-list-empty") as HTMLElement;
    expect(empty.querySelector('[aria-hidden="true"]')?.textContent).toBe("—");
    expect(within(empty).getByText("Not set").getAttribute("class")).toContain("sr-only");
    expect(screen.getByRole("button", { name: "Edit" })).toBeTruthy();
    expectTokens(list);
  });

  it("copies a value from the keyboard and announces it", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const original = Object.getOwnPropertyDescriptor(navigator, "clipboard");
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    inLocale(<DescriptionList items={items} />);
    expect(copyName).toBe("Copy: Order");
    const copy = screen.getByRole("button", { name: copyName });
    act(() => copy.focus());
    expect(document.activeElement).toBe(copy);
    await act(async () => {
      fireEvent.keyDown(copy, { key: "Enter" });
      fireEvent.keyUp(copy, { key: "Enter" });
    });
    expect(writeText).toHaveBeenCalledWith("ORD-2026-10-0914");
    expect(slot("description-list-copied")?.textContent).toBe("Copied");
    expect(slot("description-list-copied")?.getAttribute("role")).toBe("status");
    // Shown on hover, on keyboard focus and always on touch screens.
    expect(classesOf(slot("description-list-copy-control")).split(/\s+/)).toEqual(expect.arrayContaining(["group-hover/field:opacity-100", "focus-within:opacity-100", "pointer-coarse:opacity-100"]));
    // Pressing again announces again.
    const before = slot("description-list-copied")?.textContent;
    await act(async () => {
      fireEvent.keyDown(copy, { key: "Enter" });
      fireEvent.keyUp(copy, { key: "Enter" });
    });
    expect(slot("description-list-copied")?.textContent).not.toBe(before);
    expect(slot("description-list-copied")?.textContent?.replace("​", "")).toBe(DS_STRINGS.copied.en);
    if (original) Object.defineProperty(navigator, "clipboard", original);
    else Reflect.deleteProperty(navigator, "clipboard");
  });

  it("says so when the clipboard refuses", async () => {
    const original = Object.getOwnPropertyDescriptor(navigator, "clipboard");
    Object.defineProperty(navigator, "clipboard", { value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) }, configurable: true });
    inLocale(<DescriptionList items={items} />);
    const copy = screen.getByRole("button", { name: copyName });
    await act(async () => {
      fireEvent.click(copy);
    });
    expect(slot("description-list-copied")?.textContent).toBe("Could not copy");
    expect(DS_STRINGS.copyFailed.en).toBe("Could not copy");
    expect(copy.querySelector("svg")?.getAttribute("data-icon")).toBe("x");
    if (original) Object.defineProperty(navigator, "clipboard", original);
    else Reflect.deleteProperty(navigator, "clipboard");
  });

  it("stacks labels above values in a grid with set columns", () => {
    inLocale(<DescriptionList layout="stacked" columns={2} items={[{ label: "SKU", value: "LMP-0482" }, { label: "In stock", value: "48,210 units" }]} />);
    const list = slot("description-list");
    expect(list?.getAttribute("data-layout")).toBe("stacked");
    expect(classesOf(list)).toContain("@min-[480px]:grid-cols-2");
    expect(classesOf(slot("description-list-label"))).toContain("text-body-small");
    expect(classesOf(slot("description-list-item"))).not.toContain("border-t");
  });
});

describe("Timeline", () => {
  const now = new Date("2026-10-14T10:20:00Z");
  const items = [
    { id: "created", icon: "calendar-check" as const, title: "Order placed", meta: "website", timestamp: new Date("2026-10-10T19:47:00Z") },
    { id: "delivered", icon: "package-check" as const, tone: "brand" as const, title: "Order delivered", meta: "Grace H.", timestamp: new Date("2026-10-14T10:06:00Z") },
    { id: "paid", icon: "credit-card" as const, tone: "success" as const, title: "Payment received", meta: "Card", timestamp: new Date("2026-10-13T16:20:00Z") },
  ];
  const relative = (locale: string) => new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "short" });

  it("is an ordered list, newest first, with tone nodes, a rail and absolute times in the given zone", () => {
    // en-GB: day-first dates on a 24-hour clock.
    inLocale(<Timeline items={items} now={now} timeZone="Europe/Berlin" />, "en-GB");
    const list = screen.getByRole("list");
    expect(list.tagName).toBe("OL");
    const entries = within(list).getAllByRole("listitem");
    expect(entries.map((entry) => slot("timeline-title", entry)?.textContent)).toEqual(["Order delivered", "Payment received", "Order placed"]);
    expect(slot("timeline-node", entries[0])?.getAttribute("data-tone")).toBe("brand");
    expect(slot("timeline-node", entries[0])?.parentElement?.getAttribute("aria-hidden")).toBe("true");
    // The last entry has no rail below it.
    expect(slot("timeline-rail", entries[2])).toBeNull();
    // 14 minutes ago reads relative, with the exact time on the <time> element.
    const recent = entries[0]!.querySelector("time") as HTMLTimeElement;
    expect(recent.textContent).toBe(relative("en-GB").format(-14, "minute"));
    expect(recent.getAttribute("title")).toContain("12:06");
    expect(recent.getAttribute("dateTime")).toBe("2026-10-14T10:06:00.000Z");
    const older = entries[1]!.querySelector("time") as HTMLTimeElement;
    expect(older.textContent).toContain("18:20");
    expect(older.hasAttribute("title")).toBe(false);
    expect(slot("timeline-meta", entries[1])?.textContent).toContain("Card");
    for (const node of slots("timeline-node")) expectTokens(node);
  });

  it("reads just now, minutes floored, tolerates clock skew, and survives bad zones and dates", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const at = (offset: number) => new Date(now.getTime() - offset);
    inLocale(
      <Timeline
        now={now}
        timeZone="Mars/Olympus"
        items={[
          { id: "now", icon: "pencil", title: "a", timestamp: at(20_000) },
          { id: "skew", icon: "pencil", title: "b", timestamp: at(-30_000) },
          { id: "almost", icon: "pencil", title: "c", timestamp: at(59.7 * 60_000) },
          { id: "bad", icon: "pencil", title: "d", timestamp: new Date("nope") },
        ]}
      />,
    );
    expect(warn).toHaveBeenCalledTimes(1);
    const times = slots("timeline-time").map((time) => time.textContent);
    const rel = relative("en");
    expect(times).toEqual([rel.format(0, "second"), rel.format(0, "second"), rel.format(-59, "minute"), "—"]);
    expect(times.slice(0, 3)).toEqual(["now", "now", "59 min. ago"]);
    expect(slot("timeline-time", slots("timeline-item")[3])?.tagName).toBe("SPAN");
    warn.mockRestore();
  });

  it("shows absolute times on the first render and relative ones after mount", () => {
    const recent = [{ id: "r", icon: "pencil" as const, title: "a", timestamp: new Date(Date.now() - 5 * 60_000) }];
    const html = renderToString(<DesignSystemProvider locale="en" navigate={vi.fn()}><Timeline items={recent} timeZone="Europe/Berlin" /></DesignSystemProvider>);
    expect(html).not.toContain("ago");
    inLocale(<Timeline items={recent} timeZone="Europe/Berlin" />);
    expect(slot("timeline-time")?.textContent).toBe(relative("en").format(-5, "minute"));
    expect(slot("timeline-time")?.textContent).toBe("5 min. ago");
  });

  it("keeps equal times in input order oldest-first and reversed newest-first", () => {
    const same = new Date("2026-10-14T08:00:00Z");
    const pair = [{ id: "1", icon: "pencil" as const, title: "first", timestamp: same }, { id: "2", icon: "pencil" as const, title: "second", timestamp: same }];
    inLocale(<Timeline items={pair} now={now} timeZone="UTC" />);
    expect(slots("timeline-title").map((title) => title.textContent)).toEqual(["second", "first"]);
    cleanup();
    inLocale(<Timeline items={pair} now={now} timeZone="UTC" order="oldest" />);
    expect(slots("timeline-title").map((title) => title.textContent)).toEqual(["first", "second"]);
  });

  it("lists oldest first when asked, and groups by day past ten items", () => {
    inLocale(<Timeline items={items} now={now} order="oldest" timeZone="Europe/Berlin" />);
    expect(slots("timeline-title").map((title) => title.textContent)[0]).toBe("Order placed");
    cleanup();
    const many = Array.from({ length: 12 }, (_, index) => ({
      id: `e${index}`, icon: "pencil" as const, title: `Edit ${index}`, timestamp: new Date(Date.UTC(2026, 9, 10 + (index % 3), 9, index)),
    }));
    inLocale(<Timeline items={many} now={now} timeZone="Europe/Berlin" />);
    const days = screen.getAllByRole("heading", { level: 3 });
    expect(days).toHaveLength(3);
    expect(days.map((day) => day.textContent)).toEqual(["October 12, 2026", "October 11, 2026", "October 10, 2026"]);
    // Day headings are sentence case in body-small medium, not an upper-cased micro heading.
    for (const day of days) {
      expect(day.getAttribute("data-slot")).toBe("timeline-day-title");
      expect(classesOf(day).split(/\s+/)).toEqual(expect.arrayContaining(["text-body-small", "font-medium"]));
      expect(classesOf(day)).not.toMatch(/uppercase|text-heading-xxsmall|font-semibold/);
      expect(day.getAttribute("lang")).toBe("en");
      expectTokens(day);
    }
    expect(screen.getAllByRole("list")).toHaveLength(3);
    expect(slots("timeline-item")).toHaveLength(12);
  });
});

describe("strings and direction", () => {
  it("speaks a registered language, with English for a language nobody registered", () => {
    for (const key of ["deltaUp", "deltaDown", "noChange", "notSet", "copyValue", "copied"] as const) expect(DS_STRINGS[key].en, key).toBeTruthy();
    registerDsStrings("de", {
      deltaUp: "um {value} gestiegen", deltaDown: "um {value} gesunken", noChange: "unverändert", notSet: "Nicht angegeben", copyValue: "Kopieren: {label}",
    });
    // A regional tag uses its language's strings; a language nobody registered gets English.
    for (const [locale, up, down, flat, notSet, copy] of [
      ["de", "um 5 % gestiegen", "um 3 % gesunken", "unverändert", "Nicht angegeben", "Kopieren: SKU"],
      ["de-AT", "um 5 % gestiegen", "um 3 % gesunken", "unverändert", "Nicht angegeben", "Kopieren: SKU"],
      ["en", "up 5 %", "down 3 %", "no change", "Not set", "Copy: SKU"],
      ["nl", "up 5 %", "down 3 %", "no change", "Not set", "Copy: SKU"],
    ] as const) {
      inLocale(
        <>
          <Stat label="a" value="1" delta={{ value: "5 %", direction: "up" }} />
          <Stat label="b" value="2" delta={{ value: "3 %", direction: "down" }} />
          <Stat label="c" value="3" delta={{ value: "0 %", direction: "flat" }} />
          <DescriptionList items={[{ label: "SKU", value: "LMP-0482", copyValue: "LMP-0482" }, { label: "Note", value: null }]} />
        </>,
        locale,
      );
      expect(slots("stat-delta").map((delta) => delta.querySelector(".sr-only")?.textContent), locale).toEqual([up, down, flat]);
      expect(slot("description-list-empty")?.querySelector(".sr-only")?.textContent, locale).toBe(notSet);
      expect(screen.getByRole("button", { name: copy }), locale).toBeTruthy();
      cleanup();
    }
  });

  it("renders every part with logical classes, mirroring arrows and the sparkline", () => {
    const { container } = inLocale(
      <div dir="rtl">
        <Heading level={2}>ا</Heading>
        <Text elementType="p">ب</Text>
        <Prose><p>ج</p></Prose>
        <Stat label="د" value="1" delta={{ value: "1", direction: "up", isPositive: true }} comparison="ه" trend={[1, 2]} />
        <DescriptionList items={[{ label: "و", value: "ز", copyValue: "ز" }, { label: "ح", value: null }]} />
        <Timeline timeZone="UTC" items={[{ id: "a", icon: "pencil", title: "ط", meta: "ORD 1", timestamp: new Date(0) }, { id: "b", icon: "pencil", title: "ي", timestamp: new Date(1) }]} />
      </div>,
      "ar",
    );
    const parts = Array.from(container.querySelectorAll("[data-slot]"));
    expect(parts.length).toBeGreaterThan(20);
    for (const part of parts) expect(classesOf(part), part.getAttribute("data-slot") ?? "").not.toMatch(PHYSICAL);
    expect(classesOf(slot("stat-sparkline", container))).toContain("rtl:-scale-x-100");
    expect(classesOf(slot("stat-delta", container)?.querySelector("svg"))).toContain("rtl:-scale-x-100");
    expect(slot("stat-value", container)?.firstElementChild?.tagName).toBe("BDI");
    expect(slot("stat-delta", container)?.querySelector("bdi")).toBeTruthy();
    expect(container.querySelector('[data-slot="timeline-meta"] bdi')?.textContent).toBe("ORD 1");
    expect(slot("timeline-time", container)?.tagName).toBe("TIME");
  });
});
