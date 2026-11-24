import * as React from "react";
import { createTheme, formatHex } from "@senvenli/tokens";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Form } from "../form/index";
import { DesignSystemProvider } from "../provider";
import { ContrastNotes } from "./color";
import { checkBrandColor, contrastRatio, formatRatio, type ThemeCheck } from "./contrast";
import { ColorField, ColorPicker, ColorSwatch, ColorSwatchPicker } from "./index";

// The real engine, with createTheme wrapped so a test can see the input it was given.
vi.mock("@senvenli/tokens", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@senvenli/tokens")>();
  return { ...actual, createTheme: vi.fn(actual.createTheme) };
});

afterEach(cleanup);

// jsdom has no CSS.escape; React Aria's grid keyboard navigation uses it.
if (!globalThis.CSS?.escape) {
  (globalThis as { CSS?: { escape?: (value: string) => string } }).CSS = {
    ...(globalThis.CSS ?? {}),
    escape: (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`),
  };
}

const PHYSICAL = /(^|\s|:)(-?m[lr]-|p[lr]-|-?left-|-?right-|border-[lr](-|\s|$)|rounded-[lr]-|text-left|text-right)/;

const PAPER = "#FCFCFB";
const INK = "#0C0C0B";
/** Passes in both themes (paper label on light, lifted with an ink label on dark). */
const OCEAN = "#1E63D0";
/** Fails on light with a paper label (4.4:1): the engine darkens the fill. */
const PAPER_FAIL = "#0078D2";
/** Fails on light with an ink label (4.4:1): the engine lightens the fill. Passes on dark. */
const INK_FAIL = "#BF5B4B";

function wrap(ui: React.ReactElement, locale = "en", dir?: "rtl") {
  return (
    <div dir={dir}>
      <DesignSystemProvider locale={locale} navigate={vi.fn()}>{ui}</DesignSystemProvider>
    </div>
  );
}

function inLocale(ui: React.ReactElement, locale = "en", dir?: "rtl") {
  return render(wrap(ui, locale, dir));
}

/** "#1E63D0" as jsdom reports an inline color, spaces removed: "rgb(30,99,208)". */
function hexToRgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255})`;
}

const token = (hex: string, mode: "light" | "dark", name: string) => formatHex(createTheme({ primary: hex })[mode][name]!).toUpperCase();

/** Types into the hex field the way a user does, then leaves it. */
function typeHex(input: HTMLInputElement, text: string) {
  act(() => input.focus());
  fireEvent.change(input, { target: { value: text } });
  act(() => input.blur());
}

const hueSlider = (container: HTMLElement) =>
  within(container.querySelector("[data-slot='color-slider-hue']") as HTMLElement).getByRole("slider") as HTMLInputElement;


describe("contrast", () => {
  it("WCAG ratio: black on white is 21:1", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#000", "#fff")).toBeCloseTo(21, 5);
  });

  it("a color that does not parse measures as 1", () => {
    expect(contrastRatio("not a color", "#ffffff")).toBe(1);
    expect(contrastRatio("#000000", "")).toBe(1);
  });

  it("agrees with the theme engine: ground, fill and label are what createTheme derives", () => {
    for (const hex of [OCEAN, PAPER_FAIL, INK_FAIL, "#757575", "#FFEB3B", "#12853E", "#0B1F4D", "#FFFFFF", "#000000"]) {
      const check = checkBrandColor(hex)!;
      for (const mode of ["light", "dark"] as const) {
        const { fix, ...tone } = check[mode];
        expect(tone.theme).toBe(mode);
        expect(tone.ground, `${hex} ${mode}`).toBe(token(hex, mode, "ds-surface"));
        // A passing tone is the fill the engine uses; a failing one is replaced by the engine's own fill.
        const used = tone.passes ? tone : fix!;
        expect(tone.passes ? fix : fix?.passes, `${hex} ${mode}`).toBe(tone.passes ? undefined : true);
        expect(used.hex, `${hex} ${mode}`).toBe(token(hex, mode, "ds-background-brand-bold"));
        expect(used.label, `${hex} ${mode}`).toBe(token(hex, mode, "ds-text-on-brand"));
      }
    }
  });

  it("the label is paper or ink, whichever has more contrast on the tone, and AA is 4.5", () => {
    const { light, dark } = checkBrandColor(OCEAN)!;
    expect(light.hex).toBe(OCEAN);
    expect(light.label).toBe(PAPER);
    expect(light.ratio).toBeCloseTo(contrastRatio(OCEAN, PAPER), 5);
    expect(formatRatio(light.ratio, "en")).toBe("5.4:1");
    expect(light.passes).toBe(true);
    expect(light.fix).toBeUndefined();
    expect(dark.label).toBe(INK);
    expect(dark.passes).toBe(true);
  });

  it("a tone that fails on light under paper text gets a darker fill that passes", () => {
    const { light } = checkBrandColor(PAPER_FAIL)!;
    expect(light.hex).toBe(PAPER_FAIL);
    expect(light.label).toBe(PAPER);
    expect(light.passes).toBe(false);
    expect(formatRatio(light.ratio, "en")).toBe("4.4:1");
    expect(light.fix).toMatchObject({ hex: "#0076D0", label: PAPER, passes: true });
    expect(light.fix!.ratio).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(light.fix!.hex, "#000000")).toBeLessThan(contrastRatio(PAPER_FAIL, "#000000"));
  });

  it("a tone that fails on light under ink text gets a lighter fill that passes", () => {
    const { light, dark } = checkBrandColor(INK_FAIL)!;
    expect(light.label).toBe(INK);
    expect(light.passes).toBe(false);
    expect(formatRatio(light.ratio, "en")).toBe("4.4:1");
    expect(light.fix).toMatchObject({ hex: "#C05C4C", label: INK, passes: true });
    expect(contrastRatio(light.fix!.hex, "#000000")).toBeGreaterThan(contrastRatio(INK_FAIL, "#000000"));
    expect(dark.passes).toBe(true);
    expect(dark.fix).toBeUndefined();
  });

  it("a pale yellow passes in both themes with an ink label", () => {
    const { light, dark } = checkBrandColor("#FFEB3B")!;
    expect(light).toMatchObject({ hex: "#FFEB3B", label: INK, passes: true, fix: undefined });
    expect(formatRatio(light.ratio, "en")).toBe("16.0:1");
    expect(dark).toMatchObject({ label: INK, passes: true, fix: undefined });
  });

  it("dark lifts a dark color and leaves one already in range alone", () => {
    const navy = checkBrandColor("#0B1F4D")!;
    expect(navy.light.hex).toBe("#0B1F4D");
    expect(navy.dark.hex).toBe("#6A86BC");
    expect(contrastRatio(navy.dark.hex, "#000000")).toBeGreaterThan(contrastRatio("#0B1F4D", "#000000"));
    expect(navy.dark).toMatchObject({ label: INK, passes: true });
    expect(checkBrandColor("#3B82F6")!.dark.hex).toBe("#3B82F6");
  });

  it("white and black pass in both themes: dark pulls each into its lightness range", () => {
    const white = checkBrandColor("#FFFFFF")!;
    const black = checkBrandColor("#000000")!;
    expect(white.light).toMatchObject({ hex: "#FFFFFF", label: INK, passes: true });
    expect(white.dark).toMatchObject({ hex: "#D1D1D1", label: INK, passes: true });
    expect(black.light).toMatchObject({ hex: "#000000", label: PAPER, passes: true });
    expect(black.dark).toMatchObject({ hex: "#868686", label: INK, passes: true });
  });

  it("the grounds are the themes' page colors", () => {
    const { light, dark } = checkBrandColor(OCEAN)!;
    expect(light.ground).toBe(PAPER);
    expect(dark.ground).toBe(INK);
  });

  it("a color that does not parse gives null", () => {
    expect(checkBrandColor("not a color")).toBeNull();
    expect(checkBrandColor("")).toBeNull();
    expect(checkBrandColor("#12AB")).toBeNull();
  });

  it("the 3-digit shorthand is read as its 6-digit color", () => {
    expect(checkBrandColor("#16d")!.light.hex).toBe("#1166DD");
  });

  it("the rest of the theme input reaches the engine, with the checked color as its primary", () => {
    vi.mocked(createTheme).mockClear();
    checkBrandColor(OCEAN, { secondary: "#12853E", radius: 0.5 });
    expect(createTheme).toHaveBeenCalledTimes(1);
    expect(createTheme).toHaveBeenCalledWith({ secondary: "#12853E", radius: 0.5, primary: OCEAN });
  });

  it("ratios are floored to one decimal, never rounded up over the AA line", () => {
    expect(formatRatio(4.49, "en")).toBe("4.4:1");
    expect(formatRatio(5.66, "en")).toBe("5.6:1");
    expect(formatRatio(21, "en")).toBe("21.0:1");
    expect(formatRatio(4.49, "de")).toBe("4,4:1");
  });
});

describe("ColorField", () => {
  it("accepts 1e63d0 and shows #1E63D0 after blur", () => {
    const onChange = vi.fn();
    inLocale(<ColorField label="Brand color" onChange={onChange} />);
    const input = screen.getByRole("textbox", { name: "Brand color" }) as HTMLInputElement;
    typeHex(input, "1e63d0");
    expect(onChange).toHaveBeenLastCalledWith("#1E63D0");
    expect(input.value).toBe("#1E63D0");
  });

  it("accepts the 3-digit shorthand", () => {
    const onChange = vi.fn();
    inLocale(<ColorField label="Brand color" onChange={onChange} />);
    typeHex(screen.getByRole("textbox", { name: "Brand color" }) as HTMLInputElement, "#16d");
    expect(onChange).toHaveBeenLastCalledWith("#1166DD");
  });

  it("a malformed hex stays as typed, with an example of a valid one and a checkerboard swatch", () => {
    const onChange = vi.fn();
    const { container } = inLocale(<ColorField label="Accent color" defaultValue="#12853E" onChange={onChange} />);
    const input = screen.getByRole("textbox", { name: "Accent color" }) as HTMLInputElement;
    typeHex(input, "12AB");
    expect(input.value).toBe("12AB");
    expect(screen.getByText("Enter a 6-digit hex code: #1E63D0")).toBeTruthy();
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect((container.querySelector("[data-slot='color-field-swatch']") as HTMLElement).style.background).toContain("conic-gradient");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("typing a valid value again clears the error", () => {
    inLocale(<ColorField label="Accent color" />);
    const input = screen.getByRole("textbox", { name: "Accent color" }) as HTMLInputElement;
    typeHex(input, "12AB");
    typeHex(input, "12853e");
    expect(screen.queryByText(/6-digit/)).toBeNull();
    expect(input.value).toBe("#12853E");
  });

  it("Enter on a malformed hex keeps it, with the error", () => {
    inLocale(<ColorField label="Accent color" defaultValue="#12853E" />);
    const input = screen.getByRole("textbox", { name: "Accent color" }) as HTMLInputElement;
    act(() => input.focus());
    fireEvent.change(input, { target: { value: "12AB" } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.keyUp(input, { key: "Enter" });
    expect(input.value).toBe("12AB");
    expect(screen.getByText("Enter a 6-digit hex code: #1E63D0")).toBeTruthy();
  });

  it("controlled: a new value from the parent replaces a malformed entry", () => {
    function Parent() {
      const [value, setValue] = React.useState<string | null>("#12853E");
      return (
        <>
          <ColorField label="Accent color" value={value} onChange={setValue} />
          <button onClick={() => setValue("#FF0000")}>reset</button>
        </>
      );
    }
    inLocale(<Parent />);
    const input = screen.getByRole("textbox", { name: "Accent color" }) as HTMLInputElement;
    typeHex(input, "12AB");
    fireEvent.click(screen.getByText("reset"));
    expect(input.value).toBe("#FF0000");
    expect(input.getAttribute("aria-invalid")).toBeNull();
  });

  it("a single-channel field (hue) edits that channel", () => {
    inLocale(<ColorField label="Hue" channel="hue" defaultValue="#1E63D0" />);
    const input = screen.getByRole("textbox", { name: "Hue" }) as HTMLInputElement;
    expect(Number(input.value.replace(/[^\d]/g, ""))).toBeGreaterThan(200);
  });

  it("a controlled hue field on a grey keeps the typed hue", () => {
    function Parent() {
      const [value, setValue] = React.useState<string | null>("#808080");
      return <ColorField label="Hue" channel="hue" value={value} onChange={setValue} />;
    }
    inLocale(<Parent />);
    const input = screen.getByRole("textbox", { name: "Hue" }) as HTMLInputElement;
    act(() => input.focus());
    fireEvent.change(input, { target: { value: "120" } });
    act(() => input.blur());
    expect(input.value).toMatch(/120/);
  });

  it("required and left empty in a Form: says so on blur", () => {
    inLocale(<Form><ColorField label="Brand color" isRequired /></Form>);
    const input = screen.getByRole("textbox", { name: /Brand color/ }) as HTMLInputElement;
    expect(screen.queryByText("Fill in this field.")).toBeNull();
    act(() => input.focus());
    act(() => input.blur());
    expect(screen.getByText("Fill in this field.")).toBeTruthy();
    expect(input.getAttribute("aria-invalid")).toBe("true");
  });
});

describe("ColorPicker: parts and names", () => {
  it("area, hue slider and hex field are there; alpha only when asked", () => {
    const { container, rerender } = inLocale(<ColorPicker label="Brand color" defaultValue={OCEAN} />);
    expect(container.querySelector("[data-slot='color-area']")).toBeTruthy();
    expect(container.querySelector("[data-slot='color-slider-hue']")).toBeTruthy();
    expect(container.querySelector("[data-slot='color-slider-alpha']")).toBeNull();
    expect(screen.getByRole("textbox", { name: /HEX/ })).toBeTruthy();
    rerender(wrap(<ColorPicker label="Brand color" defaultValue={OCEAN} channels={["hue", "alpha"]} />));
    expect(container.querySelector("[data-slot='color-slider-alpha']")).toBeTruthy();
  });

  it("the label names the area, the sliders and the hex field", () => {
    const { container } = inLocale(<ColorPicker label="Brand color" defaultValue={OCEAN} channels={["hue", "alpha"]} />);
    const area = container.querySelector("[data-slot='color-area']")!;
    const labelId = container.querySelector("[data-slot='color-picker-label']")!.id;
    expect(area.getAttribute("aria-labelledby") ?? within(area as HTMLElement).getAllByRole("slider")[0]!.getAttribute("aria-labelledby")).toContain(labelId);
    expect(screen.getByRole("slider", { name: /^Brand color, Hue/ })).toBeTruthy();
    expect(screen.getByRole("slider", { name: /^Brand color, Alpha/ })).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Brand color · HEX" })).toBeTruthy();
  });

  it("a ReactNode label still names the sliders and the hex field", () => {
    inLocale(<ColorPicker label={<b>Brand color</b>} defaultValue={OCEAN} channels={["hue", "alpha"]} />);
    expect(screen.getByRole("slider", { name: "Brand color, Hue" })).toBeTruthy();
    expect(screen.getByRole("slider", { name: "Brand color, Alpha" })).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Brand color · HEX" })).toBeTruthy();
  });

  it("a HEX addon on the field and a 32px swatch beside it", () => {
    const { container } = inLocale(<ColorPicker label="Brand color" defaultValue={OCEAN} />);
    expect(container.querySelector("[data-slot='color-picker'] [data-slot='input-addon']")?.textContent).toBe("HEX");
    expect(container.querySelector("[data-slot='color-picker-swatch']")?.className).toContain("size-8");
    expect(container.querySelector("[data-slot='color-field-swatch']")).toBeNull();
  });

  it("without a value it starts from the neutral default primary", () => {
    inLocale(<ColorPicker label="Brand color" />);
    const neutral = formatHex(createTheme().light["ds-background-brand-bold"]!).toUpperCase();
    expect((screen.getByRole("textbox", { name: /HEX/ }) as HTMLInputElement).value).toBe(neutral);
  });

  it("keyboard focus turns the thumb's own border the focus color, with no outline", () => {
    const { container } = inLocale(<ColorPicker label="Brand color" defaultValue={OCEAN} />);
    fireEvent.keyDown(document.body, { key: "Tab" });
    const hue = hueSlider(container);
    act(() => hue.focus());
    const thumb = container.querySelector("[data-slot='color-slider-hue'] [data-slot='color-thumb']")!;
    expect(thumb.hasAttribute("data-focus-visible")).toBe(true);
    const classes = thumb.className.split(/\s+/);
    expect(classes).toContain("data-[focus-visible]:border-ds-border-focused");
    // The resting ring is paper in both themes, so it shows over any color.
    expect(classes).toContain("border-[#fcfcfb]");
    expect(classes).toContain("outline-hidden");
    expect(classes.filter((name) => /outline/.test(name))).toEqual(["outline-hidden"]);
  });

  it("RTL: no physical classes", () => {
    const { container } = inLocale(<ColorPicker label="Brand color" defaultValue={OCEAN} channels={["hue", "alpha"]} />, "ar", "rtl");
    for (const el of Array.from(container.querySelectorAll("[class]"))) expect(el.getAttribute("class")).not.toMatch(PHYSICAL);
  });

  it("RTL: ArrowRight lowers the hue (the slider runs from the inline start)", () => {
    const { container } = inLocale(<ColorPicker label="Brand color" defaultValue={OCEAN} />, "ar", "rtl");
    const hue = hueSlider(container);
    const before = Number(hue.value);
    act(() => hue.focus());
    fireEvent.keyDown(hue, { key: "ArrowRight" });
    expect(Number(hue.value)).toBeLessThan(before);
  });
});

describe("ColorPicker: changes", () => {
  it("onChange while moving, onChangeEnd on release", () => {
    const onChange = vi.fn();
    const onChangeEnd = vi.fn();
    const { container } = inLocale(<ColorPicker label="Brand color" defaultValue={OCEAN} onChange={onChange} onChangeEnd={onChangeEnd} />);
    const hue = hueSlider(container);
    act(() => hue.focus());
    fireEvent.keyDown(hue, { key: "PageUp" });
    fireEvent.keyUp(hue, { key: "PageUp" });
    expect(onChange).toHaveBeenCalled();
    const moved = onChange.mock.calls.at(-1)![0] as string;
    expect(moved).not.toBe(OCEAN);
    expect(onChangeEnd).toHaveBeenLastCalledWith(moved);
  });

  it("dragging the area: onChange during the drag, onChangeEnd once on release", () => {
    const onChange = vi.fn();
    const onChangeEnd = vi.fn();
    const { container } = inLocale(<ColorPicker label="Brand color" defaultValue={OCEAN} onChange={onChange} onChangeEnd={onChangeEnd} />);
    const area = container.querySelector("[data-slot='color-area']") as HTMLElement;
    area.getBoundingClientRect = () => ({ left: 0, top: 0, width: 240, height: 160, right: 240, bottom: 160, x: 0, y: 0, toJSON: () => ({}) });
    fireEvent.pointerDown(area, { pointerId: 1, pointerType: "mouse", button: 0, clientX: 40, clientY: 40 });
    fireEvent.pointerMove(area, { pointerId: 1, pointerType: "mouse", clientX: 120, clientY: 60 });
    fireEvent.pointerMove(area, { pointerId: 1, pointerType: "mouse", clientX: 200, clientY: 80 });
    expect(onChange.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(onChangeEnd).not.toHaveBeenCalled();
    fireEvent.pointerUp(area, { pointerId: 1, pointerType: "mouse", clientX: 200, clientY: 80 });
    expect(onChangeEnd).toHaveBeenCalledTimes(1);
  });

  it("area keys: arrows step, PageUp/PageDown step further", () => {
    const onChange = vi.fn();
    const { container } = inLocale(<ColorPicker label="Brand color" defaultValue={OCEAN} onChange={onChange} />);
    const sliders = within(container.querySelector("[data-slot='color-area']") as HTMLElement).getAllByRole("slider");
    act(() => sliders[0]!.focus());
    fireEvent.keyDown(sliders[0]!, { key: "ArrowLeft" });
    const small = onChange.mock.calls.at(-1)![0];
    fireEvent.keyDown(sliders[0]!, { key: "PageDown" });
    expect(onChange.mock.calls.at(-1)![0]).not.toBe(small);
  });

  it("the hex field commits once, and a 4-digit value never reaches the picker", () => {
    const onChange = vi.fn();
    const onChangeEnd = vi.fn();
    inLocale(<ColorPicker label="Brand color" defaultValue={OCEAN} onChange={onChange} onChangeEnd={onChangeEnd} />);
    const hex = screen.getByRole("textbox", { name: /HEX/ }) as HTMLInputElement;
    typeHex(hex, "12853e");
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith("#12853E");
    expect(onChangeEnd).toHaveBeenCalledTimes(1);
    typeHex(hex, "12AB");
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(hex.value).toBe("12AB");
  });

  it("a malformed hex gives way when the color changes elsewhere", () => {
    const { container } = inLocale(<ColorPicker label="Brand color" defaultValue={OCEAN} />);
    const hex = screen.getByRole("textbox", { name: /HEX/ }) as HTMLInputElement;
    typeHex(hex, "12AB");
    expect(hex.value).toBe("12AB");
    const hue = hueSlider(container);
    act(() => hue.focus());
    fireEvent.keyDown(hue, { key: "PageUp" });
    expect(hex.value).toMatch(/^#[0-9A-F]{6}$/);
    expect(hex.getAttribute("aria-invalid")).toBeNull();
  });
});

describe("ColorPicker: controlled", () => {
  function Controlled({ initial, onChange }: { initial: string; onChange?: (hex: string) => void }) {
    const [value, setValue] = React.useState(initial);
    return <ColorPicker label="Brand color" value={value} onChange={(hex) => { setValue(hex); onChange?.(hex); }} />;
  }

  it("a grey: the hue still moves although its hex carries no hue", () => {
    const { container } = inLocale(<Controlled initial="#808080" />);
    const hue = hueSlider(container);
    act(() => hue.focus());
    for (let i = 0; i < 3; i++) fireEvent.keyDown(hue, { key: "PageUp" });
    expect(Number(hue.getAttribute("aria-valuenow") ?? hue.value)).toBeGreaterThan(0);
  });

  it("down to black and back keeps the hue and saturation", () => {
    const { container } = inLocale(<Controlled initial={OCEAN} />);
    const hueBefore = Number(hueSlider(container).value);
    const area = Array.from(container.querySelectorAll<HTMLInputElement>("[data-slot='color-area'] input"));
    const brightness = area[1]!;
    act(() => brightness.focus());
    for (let i = 0; i < 12; i++) fireEvent.keyDown(brightness, { key: "PageDown" });
    for (let i = 0; i < 12; i++) fireEvent.keyDown(brightness, { key: "PageUp" });
    expect(Number(hueSlider(container).value)).toBe(hueBefore);
    expect(Number((area[0] as HTMLInputElement).value)).toBeGreaterThan(50);
  });

  it("a different hex from the parent replaces the color", () => {
    const { rerender } = inLocale(<ColorPicker label="Brand color" value={OCEAN} />);
    rerender(wrap(<ColorPicker label="Brand color" value={INK_FAIL} />));
    expect((screen.getByRole("textbox", { name: /HEX/ }) as HTMLInputElement).value).toBe(INK_FAIL);
  });
});

describe("ColorSwatch", () => {
  it("is a 32px tile named by its color name", () => {
    const { container } = inLocale(<ColorSwatch color={OCEAN} name="Ocean" />);
    const swatch = container.querySelector("[data-slot='color-swatch']")!;
    expect(swatch.className).toContain("size-8");
    expect(screen.getByRole("img", { name: /Ocean/ })).toBe(swatch);
  });
});

describe("ColorSwatchPicker", () => {
  const items = [
    { value: "#334155", name: "Slate" },
    { value: "#1E63D0", name: "Ocean" },
    { value: "#12853E", name: "Forest" },
  ];
  const selectedOptions = (hidden = false) => screen.getAllByRole("option", { hidden }).filter((option) => option.getAttribute("aria-selected") === "true");
  const captionOf = (container: HTMLElement) => container.querySelector("[data-slot='color-swatch-picker-caption']")?.textContent;

  it("controlled, null or an empty value clears the selection: no swatch stays checked", () => {
    const view = inLocale(<ColorSwatchPicker label="Brand color" items={items} value="#1E63D0" />);
    expect(selectedOptions()).toHaveLength(1);
    expect(document.querySelector("[data-slot='color-swatch-picker-check']")).not.toBeNull();
    for (const value of [null, ""]) {
      view.rerender(wrap(<ColorSwatchPicker label="Brand color" items={items} value={value} />, "en"));
      expect(selectedOptions()).toHaveLength(0);
      expect(document.querySelector("[data-slot='color-swatch-picker-check']")).toBeNull();
    }
  });

  it("each swatch is named; picking one says so in the caption", () => {
    const onChange = vi.fn();
    const { container } = inLocale(<ColorSwatchPicker label="Theme presets" items={items} defaultValue="#334155" onChange={onChange} />);
    expect(captionOf(container)).toBe("Slate · selected");
    fireEvent.click(screen.getByRole("option", { name: /Ocean/ }));
    expect(onChange).toHaveBeenLastCalledWith("#1E63D0");
    expect(captionOf(container)).toBe("Ocean · selected");
    expect(screen.getByRole("listbox", { name: "Theme presets" })).toBeTruthy();
  });

  it("the description follows the selection as its own sentence", () => {
    const { container } = inLocale(
      <ColorSwatchPicker label="Theme presets" items={items} defaultValue="#1E63D0" description="Every preset passes AA" />,
    );
    expect(captionOf(container)).toBe("Ocean · selected. Every preset passes AA");
  });

  it("arrow keys move between swatches", () => {
    inLocale(<ColorSwatchPicker label="Theme presets" items={items} defaultValue="#334155" />);
    const first = screen.getByRole("option", { name: /Slate/ });
    act(() => first.focus());
    fireEvent.keyDown(first, { key: "ArrowRight" });
    expect(document.activeElement).toBe(screen.getByRole("option", { name: /Ocean/ }));
  });

  const checksOf = (root: ParentNode) => Array.from(root.querySelectorAll<HTMLElement>("[data-slot='color-swatch-picker-check']"));

  it("exactly one check mark shows, on the selected swatch, and follows the selection", () => {
    const { container } = inLocale(<ColorSwatchPicker label="Theme presets" items={items} defaultValue="#334155" />);
    expect(checksOf(container)).toHaveLength(1);
    expect(checksOf(screen.getByRole("option", { name: /Slate/ }))).toHaveLength(1);
    fireEvent.click(screen.getByRole("option", { name: /Forest/ }));
    expect(checksOf(container)).toHaveLength(1);
    expect(checksOf(screen.getByRole("option", { name: /Forest/ }))).toHaveLength(1);
    expect(selectedOptions()).toEqual([screen.getByRole("option", { name: /Forest/ })]);
  });

  it("no value, or a custom color: no check mark", () => {
    const { container, rerender } = inLocale(<ColorSwatchPicker label="Theme presets" items={items} />);
    expect(checksOf(container)).toHaveLength(0);
    rerender(wrap(<ColorSwatchPicker label="Theme presets" items={items} value="#7B5AB0" />));
    expect(checksOf(container)).toHaveLength(0);
    expect(captionOf(container)).toBe("#7B5AB0 · selected");
  });

  it("the check is ink on a light swatch and paper on a dark one", () => {
    const tones = [
      { value: "#FFEB3B", name: "Sun" },
      { value: "#0B1F4D", name: "Night" },
    ];
    const { container, rerender } = inLocale(<ColorSwatchPicker label="Theme presets" items={tones} value="#FFEB3B" />);
    expect(checksOf(container)[0]!.style.color.replace(/\s/g, "")).toBe(hexToRgb(INK));
    rerender(wrap(<ColorSwatchPicker label="Theme presets" items={tones} value="#0B1F4D" />));
    expect(checksOf(container)).toHaveLength(1);
    expect(checksOf(container)[0]!.style.color.replace(/\s/g, "")).toBe(hexToRgb(PAPER));
  });

  it("the ring is keyboard focus only: no selected ring, no tint, no outline", () => {
    inLocale(<ColorSwatchPicker label="Theme presets" items={items} defaultValue="#334155" />);
    const classes = screen.getByRole("option", { name: /Slate/ }).className.split(/\s+/);
    expect(classes).toEqual(expect.arrayContaining([
      "outline-hidden",
      "data-[focus-visible]:inset-ring-2",
      "data-[focus-visible]:inset-ring-ds-border-focused",
    ]));
    expect(classes.filter((name) => /inset-ring/.test(name) && !name.startsWith("data-[focus-visible]:"))).toEqual([]);
    expect(classes.filter((name) => /(^|:)bg-/.test(name))).toEqual([]);
    expect(classes.filter((name) => /outline/.test(name))).toEqual(["outline-hidden"]);
  });

  it("allowsCustom: a button opens ColorPicker; a custom color is named in the caption", () => {
    const onChange = vi.fn();
    const { container } = inLocale(<ColorSwatchPicker label="Theme presets" items={items} defaultValue="#334155" onChange={onChange} allowsCustom />);
    fireEvent.click(screen.getByRole("button", { name: "Choose a custom color" }));
    const dialog = screen.getByRole("dialog", { name: "Choose a custom color" });
    const hex = within(dialog).getByRole("textbox") as HTMLInputElement;
    typeHex(hex, "7b5ab0");
    expect(onChange).toHaveBeenLastCalledWith("#7B5AB0");
    expect(captionOf(container)).toBe("#7B5AB0 · selected");
  });

  it("picking a custom color unselects the preset", () => {
    inLocale(<ColorSwatchPicker label="Theme presets" items={items} defaultValue="#1E63D0" allowsCustom />);
    fireEvent.click(screen.getByRole("button", { name: "Choose a custom color" }));
    typeHex(within(screen.getByRole("dialog")).getByRole("textbox") as HTMLInputElement, "7b5ab0");
    // The open popover hides the page from the accessibility tree; the options are still there to check.
    expect(selectedOptions(true)).toHaveLength(0);
    expect(checksOf(document.body)).toHaveLength(0);
  });

  it("a controlled value no preset matches leaves no preset selected", () => {
    const { rerender } = inLocale(<ColorSwatchPicker label="Theme presets" items={items} value="#1E63D0" />);
    expect(screen.getByRole("option", { name: /Ocean/ }).getAttribute("aria-selected")).toBe("true");
    rerender(wrap(<ColorSwatchPicker label="Theme presets" items={items} value="#123456" />));
    expect(selectedOptions()).toHaveLength(0);
  });

  it("RTL: no physical classes", () => {
    const { container } = inLocale(<ColorSwatchPicker label="Theme presets" items={items} defaultValue="#334155" allowsCustom />, "ar", "rtl");
    for (const el of Array.from(container.querySelectorAll("[class]"))) expect(el.getAttribute("class")).not.toMatch(PHYSICAL);
  });
});
