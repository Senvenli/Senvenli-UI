import { describe, expect, it } from "vitest";
import { createTheme, decodePreset, encodePreset, formatHex, PAPER, INK, toCSS, toNative } from "./index.js";

const failures = (input: Parameters<typeof createTheme>[0]) =>
  createTheme(input).checks.filter((c) => !c.pass).map((c) => `${c.mode} ${c.foreground}/${c.background} ${c.ratio.toFixed(2)}`);

describe("default theme", () => {
  it("passes every AA check with no input", () => {
    expect(failures({})).toEqual([]);
  });

  it("uses soft black and white, never pure", () => {
    const t = toNative(createTheme());
    expect(t.light.background).toBe("#fcfcfb");
    expect(t.dark.background).toBe("#0c0c0b");
    for (const mode of [t.light, t.dark]) {
      for (const value of Object.values(mode)) {
        expect(value).not.toBe("#000000");
        expect(value).not.toBe("#ffffff");
      }
    }
  });
});

describe("brand colors", () => {
  it("keeps a color that already passes", () => {
    const t = createTheme({ primary: "#996a00" });
    expect(formatHex(t.light.primary)).toBe("#996a00");
    expect(t.adjusted).toEqual([]);
  });

  it("adjusts a color that cannot reach AA and reports it", () => {
    const t = createTheme({ primary: "#7c66dc" });
    expect(t.adjusted).toContain("primary");
    expect(failures({ primary: "#7c66dc" })).toEqual([]);
  });

  it("passes AA across a hue, lightness and chroma sweep", () => {
    const bad: string[] = [];
    for (let h = 0; h < 360; h += 15) {
      for (const l of [0.25, 0.45, 0.65, 0.85, 0.97]) {
        for (const c of [0.03, 0.12, 0.24]) {
          const color = `oklch(${l} ${c} ${h})`;
          const f = failures({ primary: color, secondary: color, tertiary: color, success: color });
          if (f.length) bad.push(`${color}: ${f.join(", ")}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it("ignores invalid input instead of emitting it", () => {
    const t = createTheme({ primary: "not-a-color", radius: Number.NaN });
    expect(t.input).toEqual({});
  });
});

describe("outputs", () => {
  it("round-trips a preset code", () => {
    const input = { primary: "#996a00", radius: 0.5, density: "compact" as const, borderWidth: 2 as const };
    expect(decodePreset(encodePreset(input))).toEqual(input);
    expect(decodePreset("garbage")).toBeNull();
  });

  it("emits light and dark CSS variables", () => {
    const css = toCSS(createTheme({ primary: "#1268ae" }), { tailwind: true });
    expect(css).toContain(":root {");
    expect(css).toContain("--primary: oklch(");
    expect(css).toContain('.dark, [data-theme="dark"] {');
    expect(css).toContain("--color-primary: var(--primary);");
  });

  it("exposes paper and ink", () => {
    expect(formatHex(PAPER)).toBe("#fcfcfb");
    expect(formatHex(INK)).toBe("#0c0c0b");
  });
});
