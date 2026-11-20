import fs from "node:fs";
import * as React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createTheme, toCSS } from "@senvenli/tokens";
import { Button } from "../action/index";
import { DS_STRINGS, registerDsStrings } from "../i18n";
import { DesignSystemProvider } from "../provider";
import { Carousel, ScrollArea } from "./index";

const here = (file: string) => new URL(file, import.meta.url);
const theme = toCSS(createTheme(), { tailwind: true }) + fs.readFileSync(here("../../styles/theme.css"), "utf8");
const PHYSICAL = /(^|\s|:)(-?m[lr]-|p[lr]-|-?left-|-?right-|border-[lr](-|\s|$)|rounded-[lr]-|text-left|text-right)/;
const classesOf = (element: Element | null | undefined) => element?.getAttribute("class") ?? "";
const slot = (name: string, root: ParentNode = document) => root.querySelector(`[data-slot="${name}"]`);
const slots = (name: string, root: ParentNode = document) => Array.from(root.querySelectorAll(`[data-slot="${name}"]`));

function inLocale(ui: React.ReactElement, locale = "en") {
  return render(<DesignSystemProvider locale={locale} navigate={vi.fn()}>{ui}</DesignSystemProvider>);
}

function expectTokens(element: Element | null | undefined) {
  for (const utility of classesOf(element).split(/\s+/)) {
    const color = /(?:^|:)(?:bg|text|ring|inset-ring)-(ds-(?:background|surface|icon|text|border)[a-z-]*)$/.exec(utility);
    if (color) expect(theme, utility).toContain(`--color-${color[1]}:`);
    const shadow = /(?:^|:)shadow-(ds-[a-z-]+)$/.exec(utility);
    if (shadow) expect(theme, utility).toContain(`--shadow-${shadow[1]}:`);
  }
}

const press = (element: Element, key: string) => {
  fireEvent.keyDown(element, { key });
  fireEvent.keyUp(element, { key });
};

const photos = [
  { src: "/lamp-front.jpg", alt: "Front view" },
  { src: "/lamp-side.jpg", alt: "Side view" },
  { src: "/lamp-detail.jpg", alt: "Detail" },
];

/** jsdom has no layout: slides are 300px wide in a 300px viewport, moved by scrollLeft; scrollTo lands at once. */
const WIDTH = 300;
let scrollCalls: ScrollToOptions[] = [];
const box = (left: number) => ({ left, right: left + WIDTH, top: 0, bottom: 100, width: WIDTH, height: 100, x: left, y: 0, toJSON() {} }) as DOMRect;
beforeEach(() => {
  scrollCalls = [];
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => WIDTH });
  window.matchMedia = ((query: string) => ({ matches: false, media: query, addEventListener: () => {}, removeEventListener: () => {} })) as unknown as typeof window.matchMedia;
  Element.prototype.scrollTo = function (this: Element, options?: ScrollToOptions | number) {
    if (typeof options !== "object") return;
    scrollCalls.push(options);
    if (options.left !== undefined) this.scrollLeft = options.left;
  } as Element["scrollTo"];
  Element.prototype.getBoundingClientRect = function (this: Element) {
    if (this.getAttribute("data-slot") === "carousel-slide") {
      const parent = this.parentElement as HTMLElement;
      return box(Array.from(parent.children).indexOf(this) * WIDTH - parent.scrollLeft);
    }
    return box(0);
  };
});

/** A ResizeObserver stand-in the tests trigger, as a real resize would. */
const observers = new Set<() => void>();
const resizeAll = () => act(() => observers.forEach((callback) => callback()));
beforeEach(() => {
  observers.clear();
  globalThis.ResizeObserver = class {
    private readonly callback: () => void;
    constructor(callback: () => void) {
      this.callback = callback;
      observers.add(callback);
    }
    observe() {}
    unobserve() {}
    disconnect() {
      observers.delete(this.callback);
    }
  } as unknown as typeof ResizeObserver;
});

/** The user swipes or scrolls the strip to a slide; the scroll then settles. */
function swipeTo(slide: number) {
  const viewport = slot("carousel-viewport") as HTMLElement;
  viewport.scrollLeft = slide * WIDTH;
  fireEvent.scroll(viewport);
  fireEvent(viewport, new Event("scrollend"));
}
afterEach(cleanup);

describe("Carousel", () => {
  it("is a named carousel region of named slides, showing one at a time", () => {
    inLocale(<Carousel aria-label="Desk lamp photos" items={photos} />);
    const region = screen.getByRole("region", { name: "Desk lamp photos" });
    expect(region.getAttribute("aria-roledescription")).toBe("carousel");
    const slides = slots("carousel-slide");
    expect(slides.map((slide) => slide.getAttribute("aria-label"))).toEqual(["Image 1 of 3", "Image 2 of 3", "Image 3 of 3"]);
    expect(slides.map((slide) => slide.getAttribute("aria-hidden"))).toEqual([null, "true", "true"]);
    expect(slides[0].querySelector("img")?.getAttribute("alt")).toBe("Front view");
    expect(slot("carousel-counter")?.textContent).toBe("1 / 3");
    // Nothing is said until the user changes the image.
    expect(slot("carousel-status")?.textContent).toBe("");
  });

  it("pages with its own buttons, which need no outside class, and says where it is", () => {
    const onIndexChange = vi.fn();
    inLocale(<Carousel aria-label="Photos" items={photos} onIndexChange={onIndexChange} />);
    const previous = screen.getByRole("button", { name: DS_STRINGS.previousImage.en });
    const next = screen.getByRole("button", { name: DS_STRINGS.nextImage.en });
    expect(previous.hasAttribute("data-disabled")).toBe(true);
    // Visible on their own: no group-hover from a parent the consumer has to add.
    expect(classesOf(next)).not.toMatch(/(^|\s)(group-hover\S*|opacity-0)(\s|$)/);
    fireEvent.click(next);
    expect(onIndexChange).toHaveBeenLastCalledWith(1);
    expect(slot("carousel-counter")?.textContent).toBe("2 / 3");
    expect(slot("carousel-status")?.textContent).toBe(DS_STRINGS.imagePosition.en.replace("{index}", "2").replace("{total}", "3"));
    expect(slots("carousel-slide")[1].hasAttribute("aria-hidden")).toBe(false);
    fireEvent.click(next);
    expect(next.hasAttribute("data-disabled")).toBe(true);
    expect(scrollCalls.at(-1)?.behavior).toBe("smooth");
    expectTokens(next);
  });

  it("takes arrow keys, Home and End only while focus is inside it", () => {
    const onIndexChange = vi.fn();
    inLocale(
      <>
        <Carousel aria-label="Photos" items={photos} onIndexChange={onIndexChange} />
        <input aria-label="Another field" />
      </>,
    );
    // A key anywhere else on the page does nothing: there is no window listener.
    press(screen.getByRole("textbox", { name: "Another field" }), "ArrowRight");
    press(document.body, "ArrowRight");
    expect(onIndexChange).not.toHaveBeenCalled();
    const viewport = slot("carousel-viewport") as HTMLElement;
    expect(viewport.tabIndex).toBe(0);
    act(() => viewport.focus());
    press(viewport, "ArrowRight");
    expect(onIndexChange).toHaveBeenLastCalledWith(1);
    press(viewport, "End");
    expect(onIndexChange).toHaveBeenLastCalledWith(2);
    press(viewport, "Home");
    expect(onIndexChange).toHaveBeenLastCalledWith(0);
  });

  it("mirrors the arrow keys and chevrons in RTL", () => {
    const onIndexChange = vi.fn();
    inLocale(<Carousel aria-label="صور" items={photos} onIndexChange={onIndexChange} />, "ar");
    const viewport = slot("carousel-viewport") as HTMLElement;
    press(viewport, "ArrowLeft");
    expect(onIndexChange).toHaveBeenLastCalledWith(1);
    press(viewport, "ArrowRight");
    expect(onIndexChange).toHaveBeenLastCalledWith(0);
    expect(classesOf(slot("carousel-next")?.querySelector("svg"))).toContain("rtl:-scale-x-100");
  });

  it("goes back to the first image when the photos change", () => {
    const onIndexChange = vi.fn();
    const ui = (items: typeof photos) => (
      <DesignSystemProvider locale="en" navigate={vi.fn()}>
        <Carousel aria-label="Photos" items={items} onIndexChange={onIndexChange} defaultIndex={2} />
      </DesignSystemProvider>
    );
    const { rerender } = render(ui(photos));
    expect(slot("carousel-counter")?.textContent).toBe("3 / 3");
    rerender(ui([{ src: "/chair-front.jpg", alt: "Front" }, { src: "/chair-back.jpg", alt: "Back" }]));
    expect(slot("carousel-counter")?.textContent).toBe("1 / 2");
    expect(onIndexChange).toHaveBeenLastCalledWith(0);
    expect((slot("carousel-viewport") as HTMLElement).scrollLeft).toBe(0);
    // The reset jumps, it does not animate across the old set.
    expect(scrollCalls.at(-1)?.behavior).toBe("auto");
  });

  it("shows the starting image on mount, without animating the page load", () => {
    inLocale(<Carousel aria-label="F" items={photos} defaultIndex={2} />);
    expect(scrollCalls[0]).toEqual({ left: 600, behavior: "auto" });
    expect(slot("carousel-counter")?.textContent).toBe("3 / 3");
    expect(slots("carousel-slide")[2].hasAttribute("aria-hidden")).toBe(false);
    cleanup();
    scrollCalls = [];
    inLocale(<Carousel aria-label="F" items={photos} index={1} />);
    expect(scrollCalls).toEqual([{ left: 300, behavior: "auto" }]);
  });

  it("follows a swipe once the scroll settles, and never fights it when controlled", () => {
    const onIndexChange = vi.fn();
    function Controlled() {
      const [index, setIndex] = React.useState(0);
      return <Carousel aria-label="F" items={photos} index={index} onIndexChange={(next) => { onIndexChange(next); setIndex(next); }} />;
    }
    inLocale(<Controlled />);
    const viewport = slot("carousel-viewport") as HTMLElement;
    // Mid-swipe scroll events commit nothing.
    viewport.scrollLeft = 2 * WIDTH;
    fireEvent.scroll(viewport);
    expect(onIndexChange).not.toHaveBeenCalled();
    fireEvent(viewport, new Event("scrollend"));
    expect(onIndexChange).toHaveBeenCalledWith(2);
    expect(slot("carousel-counter")?.textContent).toBe("3 / 3");
    // The parent echoes the index back; the carousel does not scroll against the user's gesture.
    expect(scrollCalls).toHaveLength(0);
  });

  it("settles without scrollend too (Safari before 18)", () => {
    // Take scrollend away, as Safari before 18 has none; always put it back.
    let owner: object | null = HTMLElement.prototype;
    while (owner && !Object.prototype.hasOwnProperty.call(owner, "onscrollend")) owner = Object.getPrototypeOf(owner);
    const descriptor = owner ? Object.getOwnPropertyDescriptor(owner, "onscrollend") : undefined;
    if (owner) Reflect.deleteProperty(owner, "onscrollend");
    vi.useFakeTimers();
    try {
      const onIndexChange = vi.fn();
      inLocale(<Carousel aria-label="F" items={photos} onIndexChange={onIndexChange} />);
      const viewport = slot("carousel-viewport") as HTMLElement;
      viewport.scrollLeft = WIDTH;
      fireEvent.scroll(viewport);
      act(() => vi.advanceTimersByTime(100));
      fireEvent.scroll(viewport);
      act(() => vi.advanceTimersByTime(100));
      expect(onIndexChange).not.toHaveBeenCalled();
      act(() => vi.advanceTimersByTime(60));
      expect(onIndexChange).toHaveBeenCalledWith(1);
    } finally {
      vi.useRealTimers();
      if (owner && descriptor) Object.defineProperty(owner, "onscrollend", descriptor);
    }
  });

  it("leaves settling to scrollend where it exists: a pause mid-drag commits nothing", () => {
    vi.useFakeTimers();
    const onIndexChange = vi.fn();
    inLocale(<Carousel aria-label="F" items={photos} onIndexChange={onIndexChange} />);
    const viewport = slot("carousel-viewport") as HTMLElement;
    expect("onscrollend" in viewport).toBe(true);
    viewport.scrollLeft = WIDTH;
    fireEvent.scroll(viewport);
    act(() => vi.advanceTimersByTime(500));
    expect(onIndexChange).not.toHaveBeenCalled();
    fireEvent(viewport, new Event("scrollend"));
    expect(onIndexChange).toHaveBeenCalledWith(1);
    vi.useRealTimers();
  });

  it("follows the user when they take over a scroll it started", () => {
    inLocale(<Carousel aria-label="F" items={photos} />);
    const viewport = slot("carousel-viewport") as HTMLElement;
    act(() => viewport.focus());
    press(viewport, "End");
    expect(slot("carousel-counter")?.textContent).toBe("3 / 3");
    // A trackpad scroll settles on the second image instead.
    swipeTo(1);
    expect(slot("carousel-counter")?.textContent).toBe("2 / 3");
    expect(slots("carousel-slide")[1].hasAttribute("aria-hidden")).toBe(false);
  });

  it("keeps focus inside when an arrow reaches the end and disables itself", () => {
    inLocale(<Carousel aria-label="F" items={photos} />);
    const next = screen.getByRole("button", { name: DS_STRINGS.nextImage.en });
    act(() => next.focus());
    press(next, "Enter");
    expect(document.activeElement).toBe(next);
    press(next, "Enter");
    expect(next.hasAttribute("data-disabled")).toBe(true);
    expect(document.activeElement).toBe(slot("carousel-viewport"));
  });

  it("leaves Alt, Ctrl and Cmd arrows to the browser", () => {
    const onIndexChange = vi.fn();
    inLocale(<Carousel aria-label="F" items={photos} onIndexChange={onIndexChange} />);
    const viewport = slot("carousel-viewport") as HTMLElement;
    fireEvent.keyDown(viewport, { key: "ArrowRight", altKey: true });
    fireEvent.keyDown(viewport, { key: "ArrowRight", ctrlKey: true });
    fireEvent.keyDown(viewport, { key: "ArrowRight", metaKey: true });
    expect(onIndexChange).not.toHaveBeenCalled();
  });

  it("does not report a reset when it already shows the first image", () => {
    const onIndexChange = vi.fn();
    const ui = (items: typeof photos) => (
      <DesignSystemProvider locale="en" navigate={vi.fn()}><Carousel aria-label="F" items={items} onIndexChange={onIndexChange} /></DesignSystemProvider>
    );
    const { rerender } = render(ui(photos));
    rerender(ui(photos.slice(0, 2)));
    expect(onIndexChange).not.toHaveBeenCalled();
  });

  it("waits for a size when mounted hidden, then shows the starting image", () => {
    const callbacks: (() => void)[] = [];
    globalThis.ResizeObserver = class {
      constructor(callback: () => void) {
        callbacks.push(callback);
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
    let width = 0;
    Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => width });
    inLocale(<Carousel aria-label="F" items={photos} defaultIndex={2} />);
    expect(scrollCalls).toHaveLength(0);
    width = WIDTH;
    act(() => callbacks.forEach((callback) => callback()));
    expect(scrollCalls).toEqual([{ left: 600, behavior: "auto" }]);
  });

  it("scrolls the thumbnail strip to the starting thumbnail without animating", () => {
    // The strip shows 160px; each 72px thumbnail sits at 80px steps, so the third is past its end.
    const base = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function (this: Element) {
      if (this.getAttribute("data-slot") === "carousel-thumbnails") return { ...box(0), right: 160, width: 160 } as DOMRect;
      if (this.getAttribute("data-slot") === "carousel-thumbnail") {
        const strip = this.parentElement as HTMLElement;
        const left = Array.from(strip.children).indexOf(this) * 80 - strip.scrollLeft;
        return { ...box(left), right: left + 72, width: 72 } as DOMRect;
      }
      return base.call(this);
    };
    try {
      inLocale(<Carousel aria-label="F" items={photos} defaultIndex={2} showThumbnails />);
      const strip = slot("carousel-thumbnails") as HTMLElement;
      // Third thumb: 160–232px against a 160px strip, so the strip scrolls 72px, at once.
      expect(strip.scrollLeft).toBe(72);
      for (const call of scrollCalls) expect(call.behavior).toBe("auto");
    } finally {
      Element.prototype.getBoundingClientRect = base;
    }
  });

  it("can be a plain group instead of a landmark inside repeated cards", () => {
    inLocale(<Carousel aria-label="Lamp photos" items={photos} isLandmark={false} />);
    expect(screen.queryByRole("region")).toBeNull();
    expect(slot("carousel")?.getAttribute("role")).toBe("group");
    expect(slot("carousel")?.getAttribute("aria-roledescription")).toBe("carousel");
    // The focusable viewport is named by the carousel; the slide in view says the position (not twice).
    expect(slot("carousel-viewport")?.getAttribute("aria-label")).toBe("Lamp photos");
  });

  it("leaves no listener behind when the photos change or it unmounts", () => {
    // Warm up once, so React Aria's own one-time global listeners are already in place.
    const warm = inLocale(<Carousel aria-label="W" items={photos} />);
    warm.unmount();
    const counts = new Map<string, number>();
    const spies = [window, document].flatMap((target) => {
      const add = target.addEventListener.bind(target);
      const remove = target.removeEventListener.bind(target);
      return [
        vi.spyOn(target, "addEventListener").mockImplementation(((type: string, ...rest: unknown[]) => {
          counts.set(type, (counts.get(type) ?? 0) + 1);
          return (add as (...args: unknown[]) => void)(type, ...rest);
        }) as never),
        vi.spyOn(target, "removeEventListener").mockImplementation(((type: string, ...rest: unknown[]) => {
          counts.set(type, (counts.get(type) ?? 0) - 1);
          return (remove as (...args: unknown[]) => void)(type, ...rest);
        }) as never),
      ];
    });
    const ui = (items: typeof photos) => (
      <DesignSystemProvider locale="en" navigate={vi.fn()}><Carousel aria-label="F" items={items} /></DesignSystemProvider>
    );
    const { rerender, unmount } = render(ui(photos));
    for (let round = 0; round < 5; round++) rerender(ui(round % 2 ? photos : photos.slice(0, 2)));
    // Keys go through the carousel's own onKeyDown and scroll through the viewport's onScroll.
    for (const type of ["keydown", "resize", "scroll"]) expect(counts.get(type) ?? 0, type).toBe(0);
    unmount();
    for (const [type, count] of counts) expect(count, type).toBeLessThanOrEqual(0);
    for (const spy of spies) spy.mockRestore();
  });

  it("jumps instead of animating under reduced motion", () => {
    window.matchMedia = ((query: string) => ({ matches: query.includes("reduce"), media: query, addEventListener: () => {}, removeEventListener: () => {} })) as unknown as typeof window.matchMedia;
    inLocale(<Carousel aria-label="F" items={photos} />);
    fireEvent.click(screen.getByRole("button", { name: DS_STRINGS.nextImage.en }));
    expect(scrollCalls.at(-1)?.behavior).toBe("auto");
  });

  it("has dots with 24px targets", () => {
    inLocale(<Carousel aria-label="F" items={photos} />);
    const dots = slots("carousel-dot");
    expect(dots).toHaveLength(3);
    for (const dot of dots) expect(classesOf(dot).split(/\s+/)).toEqual(expect.arrayContaining(["h-6", "min-w-6"]));
    expect(dots[0].getAttribute("aria-current")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: DS_STRINGS.goToImage.en.replace("{index}", "3") }));
    expect(slot("carousel-counter")?.textContent).toBe("3 / 3");
  });

  it("with thumbnails, makes them the controls and the dots only an indicator", () => {
    inLocale(<Carousel aria-label="F" items={photos} showThumbnails />);
    expect(screen.queryAllByRole("button", { name: /3/ }).filter((button) => button.getAttribute("data-slot") === "carousel-dot")).toHaveLength(0);
    expect(slot("carousel-dots")?.getAttribute("aria-hidden")).toBe("true");
    fireEvent.click(slots("carousel-thumbnail")[2]);
    expect(slot("carousel-counter")?.textContent).toBe("3 / 3");
    const thumbs = slots("carousel-thumbnail");
    expect(thumbs.map((thumb) => thumb.getAttribute("aria-label"))).toEqual(["Front view", "Side view", "Detail"]);
    expect(thumbs[2].getAttribute("aria-current")).toBe("true");
    // Drawn inside the button, above the photo, so the strip's overflow never clips it; focus is a separate inner border.
    expect(classesOf(thumbs[2])).toContain("after:inset-ring-ds-border-selected");
    expect(classesOf(thumbs[0])).not.toContain("after:inset-ring-ds-border-selected");
    expect(classesOf(thumbs[0])).toContain("data-[focus-visible]:before:inset-ring-ds-border-focused");
    fireEvent.click(thumbs[0]);
    expect(slot("carousel-counter")?.textContent).toBe("1 / 3");
    expectTokens(slot("carousel-frame"));
    expectTokens(slot("carousel-counter"));
  });

  it("follows a controlled index and shows the image icon with no photos", () => {
    const ui = (index: number) => (
      <DesignSystemProvider locale="en" navigate={vi.fn()}><Carousel aria-label="F" items={photos} index={index} /></DesignSystemProvider>
    );
    const { rerender } = render(ui(0));
    rerender(ui(2));
    expect(slot("carousel-counter")?.textContent).toBe("3 / 3");
    cleanup();
    inLocale(<Carousel aria-label="F" items={[]} />);
    expect(slot("carousel-frame")?.querySelector("svg")?.getAttribute("data-icon")).toBe("image");
    expect(slot("carousel-previous")).toBeNull();
  });
});

describe("ScrollArea", () => {
  function sized(element: HTMLElement, { scroll, client }: { scroll: number; client: number }) {
    Object.defineProperty(element, "scrollHeight", { value: scroll, configurable: true });
    Object.defineProperty(element, "clientHeight", { value: client, configurable: true });
  }

  it("becomes a named, focusable region when it scrolls and holds nothing focusable", () => {
    inLocale(
      <ScrollArea aria-label="Notifications" maxHeight={180}>
        {Array.from({ length: 12 }, (_, index) => <p key={index}>Notification {index}</p>)}
      </ScrollArea>,
    );
    const viewport = slot("scroll-area-viewport") as HTMLElement;
    sized(viewport, { scroll: 600, client: 180 });
    resizeAll();
    const region = screen.getByRole("region", { name: "Notifications" });
    expect(region.tabIndex).toBe(0);
    expect(region.style.maxHeight).toBe("180px");
    expect(classesOf(region)).toContain("overflow-y-auto");
    // The focus border is drawn above the content.
    expect(classesOf(slot("scroll-area-focus"))).toContain("peer-focus-visible:inset-ring-2");
  });

  it("leaves focus to its children when they can take it", () => {
    inLocale(
      <ScrollArea aria-label="Menu" maxHeight={120}>
        {Array.from({ length: 8 }, (_, index) => <Button key={index}>Option {index}</Button>)}
      </ScrollArea>,
    );
    const viewport = slot("scroll-area-viewport") as HTMLElement;
    sized(viewport, { scroll: 400, client: 120 });
    resizeAll();
    expect(viewport.hasAttribute("tabindex")).toBe(false);
    expect(screen.queryByRole("region")).toBeNull();
  });

  it("shows the overflow shadow on each edge only where content continues", () => {
    inLocale(<ScrollArea aria-label="List" maxHeight={100}><div style={{ height: 400 }} /></ScrollArea>);
    const viewport = slot("scroll-area-viewport") as HTMLElement;
    sized(viewport, { scroll: 400, client: 100 });
    const [start, end] = slots("scroll-area-edge");
    fireEvent.scroll(viewport);
    expect(classesOf(start)).toContain("opacity-0");
    expect(classesOf(end)).not.toContain("opacity-0");
    viewport.scrollTop = 300;
    fireEvent.scroll(viewport);
    expect(classesOf(start)).not.toContain("opacity-0");
    expect(classesOf(end)).toContain("opacity-0");
    expect(start.getAttribute("aria-hidden")).toBe("true");
    expectTokens(start);
  });

  it("does not trap the wheel or touch: plain native overflow", () => {
    inLocale(<ScrollArea aria-label="Code" orientation="horizontal"><pre>a long line</pre></ScrollArea>);
    const viewport = slot("scroll-area-viewport") as HTMLElement;
    expect(classesOf(viewport)).toContain("overflow-x-auto");
    expect(viewport.getAttribute("onwheel")).toBeNull();
    // The scrollbar: thin, hidden until hover, keyboard focus or scrolling.
    expect(classesOf(viewport).split(/\s+/)).toEqual(expect.arrayContaining([
      "[scrollbar-width:thin]", "[scrollbar-color:transparent_transparent]",
      "hover:[scrollbar-color:color-mix(in_oklab,var(--ds-border-bold)_70%,transparent)_transparent]",
    ]));
    fireEvent.scroll(viewport);
    expect(viewport.hasAttribute("data-scrolling")).toBe(true);
    expect(slots("scroll-area-edge").map((edge) => edge.getAttribute("data-edge"))).toEqual(["start", "end"]);
    // The shadow casters sit outside the box; the root clips them so the area never widens its column.
    expect(classesOf(slot("scroll-area"))).toContain("overflow-clip");
  });
});

describe("ScrollArea behaviour over time", () => {
  function sized(element: HTMLElement, scroll: number, client: number) {
    Object.defineProperty(element, "scrollHeight", { value: scroll, configurable: true });
    Object.defineProperty(element, "clientHeight", { value: client, configurable: true });
  }

  it("keeps the thumb shown through a long scroll and hides it 800ms after the last event", () => {
    vi.useFakeTimers();
    inLocale(<ScrollArea aria-label="List" maxHeight={100}><div style={{ height: 400 }} /></ScrollArea>);
    const viewport = slot("scroll-area-viewport") as HTMLElement;
    for (let step = 0; step < 4; step++) {
      fireEvent.scroll(viewport);
      act(() => vi.advanceTimersByTime(500));
      expect(viewport.hasAttribute("data-scrolling"), `step ${step}`).toBe(true);
    }
    act(() => vi.advanceTimersByTime(400));
    expect(viewport.hasAttribute("data-scrolling")).toBe(false);
    vi.useRealTimers();
  });

  it("notices focusable children that arrive later, and never drops focus it holds", async () => {
    const ui = (withButton: boolean) => (
      <DesignSystemProvider locale="en" navigate={vi.fn()}>
        <ScrollArea aria-label="List" maxHeight={100}>
          <p>Long content</p>
          {withButton && <Button>Open</Button>}
          <input type="hidden" name="hidden" />
        </ScrollArea>
      </DesignSystemProvider>
    );
    const { rerender } = render(ui(false));
    const viewport = slot("scroll-area-viewport") as HTMLElement;
    sized(viewport, 400, 100);
    resizeAll();
    // A hidden input is not a tab stop: the region still takes focus.
    expect(viewport.tabIndex).toBe(0);
    act(() => viewport.focus());
    rerender(ui(true));
    await act(async () => {});
    // It holds focus right now, so it keeps its tab stop until focus leaves.
    expect(viewport.tabIndex).toBe(0);
    act(() => viewport.blur());
    await act(async () => {});
    expect(viewport.hasAttribute("tabindex")).toBe(false);
  });
});

describe("strings and direction", () => {
  it("speaks a registered language, with English for a language nobody registered", () => {
    for (const key of ["imagePosition", "previousImage", "nextImage", "goToImage"] as const) expect(DS_STRINGS[key].en, key).toBeTruthy();
    registerDsStrings("de", { imagePosition: "Bild {index} von {total}", previousImage: "Vorheriges Bild", nextImage: "Nächstes Bild", goToImage: "Zu Bild {index}" });
    // A regional tag uses its language's strings; a language nobody registered gets English.
    for (const [locale, position, previous, next, goTo] of [
      ["de", "Bild 1 von 3", "Vorheriges Bild", "Nächstes Bild", "Zu Bild 3"],
      ["de-AT", "Bild 1 von 3", "Vorheriges Bild", "Nächstes Bild", "Zu Bild 3"],
      ["en", "Image 1 of 3", "Previous image", "Next image", "Go to image 3"],
      ["nl", "Image 1 of 3", "Previous image", "Next image", "Go to image 3"],
    ] as const) {
      inLocale(<Carousel aria-label="Photos" items={photos} />, locale);
      expect(slots("carousel-slide")[0]?.getAttribute("aria-label"), locale).toBe(position);
      expect(screen.getByRole("button", { name: previous }), locale).toBeTruthy();
      expect(screen.getByRole("button", { name: next }), locale).toBeTruthy();
      expect(screen.getByRole("button", { name: goTo }), locale).toBeTruthy();
      cleanup();
    }
  });

  it("renders every part with logical classes", () => {
    const { container } = inLocale(
      <div dir="rtl">
        <Carousel aria-label="ا" items={photos} showThumbnails />
        <ScrollArea aria-label="ب" orientation="horizontal"><span>ج</span></ScrollArea>
        <ScrollArea aria-label="د"><span>ه</span></ScrollArea>
      </div>,
      "ar",
    );
    const parts = Array.from(container.querySelectorAll("[data-slot]"));
    expect(parts.length).toBeGreaterThan(15);
    for (const part of parts) expect(classesOf(part), part.getAttribute("data-slot") ?? "").not.toMatch(PHYSICAL);
  });
});
