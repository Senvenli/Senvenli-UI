import { describe, expect, it } from "vitest";
import { checkThemeCss, createTheme, decodePreset, encodePreset, formatHex, INK, layoutTokens, PAPER, toCSS, toNative } from "./index.js";

const failures = (input: Parameters<typeof createTheme>[0]) =>
  createTheme(input)
    .checks.filter((c) => !c.pass)
    .map((c) => `${c.mode} ${c.foreground}/${c.background} ${c.ratio.toFixed(2)}`);

describe("default theme", () => {
  it("passes every AA check with no input", () => {
    expect(failures({})).toEqual([]);
  });

  it("keeps the neutral surfaces and text of the existing system", () => {
    const t = toNative(createTheme());
    expect(t.light["ds-surface"]).toBe("#fcfcfb");
    expect(t.dark["ds-surface"]).toBe("#0c0c0b");
    expect(t.light["ds-text"]).toBe("#2a2825");
    expect(t.dark["ds-text"]).toBe("#e6e4e0");
    expect(t.light["ds-background-neutral"]).toBe("#f4f3f1");
    expect(t.light["ds-background-brand-bold"]).toBe("#1f1e1c");
  });

  it("never uses pure black or white", () => {
    const t = toNative(createTheme());
    for (const mode of [t.light, t.dark]) {
      for (const [name, value] of Object.entries(mode)) {
        expect([name, value.slice(0, 7)]).not.toEqual([name, "#000000"]);
        expect([name, value.slice(0, 7)]).not.toEqual([name, "#ffffff"]);
      }
    }
  });

  it("emits the same token names in light and dark", () => {
    const t = createTheme();
    expect(Object.keys(t.dark).sort()).toEqual(Object.keys(t.light).sort());
  });
});

describe("brand colors", () => {
  it("keeps a primary that already passes", () => {
    const t = createTheme({ primary: "#996a00" });
    expect(formatHex(t.light["ds-background-brand-bold"]!)).toBe("#996a00");
    expect(t.adjusted).toEqual([]);
  });

  it("adjusts a color that cannot reach AA and reports it", () => {
    const t = createTheme({ primary: "#7c66dc" });
    expect(t.adjusted).toContain("primary");
    expect(failures({ primary: "#7c66dc" })).toEqual([]);
  });

  it("tints neutral buttons with the secondary color and keeps them readable", () => {
    const t = createTheme({ secondary: "#1268ae" });
    expect(t.light["ds-background-neutral"]!.h).toBeCloseTo(t.light["ds-background-secondary-bold"]!.h, 0);
    expect(failures({ secondary: "#1268ae" })).toEqual([]);
  });

  it("passes AA across a hue, lightness and chroma sweep", () => {
    const bad: string[] = [];
    for (let h = 0; h < 360; h += 15) {
      for (const l of [0.25, 0.45, 0.65, 0.85, 0.97]) {
        for (const c of [0.03, 0.12, 0.24]) {
          const color = `oklch(${l} ${c} ${h})`;
          const f = failures({ primary: color, secondary: color, tertiary: color, success: color, warning: color });
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

describe("layout", () => {
  it("matches the existing scale at the default radius and density", () => {
    const l = Object.fromEntries(layoutTokens(createTheme().layout));
    expect(l["ds-radius-xsmall"]).toBe("0.125rem");
    expect(l["ds-radius-medium"]).toBe("0.625rem");
    expect(l["ds-radius-large"]).toBe("1rem");
    expect(l["ds-space-200"]).toBe("16px");
    expect(l["ds-size-control"]).toBe("36px");
    expect(l["ds-border-width"]).toBe("1px");
  });

  it("scales spacing and control heights with density, not icons", () => {
    const l = Object.fromEntries(layoutTokens(createTheme({ density: "compact" }).layout));
    expect(l["ds-space-200"]).toBe("14px");
    expect(l["ds-size-control"]).toBe("31.5px");
    expect(l["ds-size-icon"]).toBe("16px");
  });
});

describe("outputs", () => {
  it("round-trips a preset code", () => {
    const input = { primary: "#996a00", radius: 0.5, density: "compact" as const, borderWidth: 2 as const };
    expect(decodePreset(encodePreset(input))).toEqual(input);
    expect(decodePreset("garbage")).toBeNull();
  });

  it("emits ds- prefixed CSS variables and the Tailwind mapping", () => {
    const css = toCSS(createTheme({ primary: "#1268ae" }), { tailwind: true });
    expect(css).toContain(':root, [data-theme="light"] {');
    expect(css).toContain("--ds-background-brand-bold: oklch(");
    expect(css).toContain('[data-theme="dark"], .dark {');
    expect(css).toContain("--color-ds-surface: var(--ds-surface);");
    expect(css).toContain("--spacing-ds-200: var(--ds-space-200);");
    expect(css).toContain("--radius-ds-medium: var(--ds-radius-medium);");
    expect(css).toMatch(/--ds-border: oklch\([^)]* \/ 0\.08\);/);
  });

  it("exposes paper and ink", () => {
    expect(formatHex(PAPER)).toBe("#fcfcfb");
    expect(formatHex(INK)).toBe("#0c0c0b");
  });
});

describe("checkThemeCss", () => {
  it("a theme the engine wrote passes every pair it checks, with nothing missing", () => {
    const theme = createTheme({ primary: "#1268ae" });
    const report = checkThemeCss(toCSS(theme, { tailwind: true }));
    expect(report.missing).toEqual([]);
    expect(report.checks).toHaveLength(theme.checks.length);
    expect(report.checks.every((check) => check.pass)).toBe(true);
  });

  it("finds a pair an edit broke, in the mode it was broken in", () => {
    const css = toCSS(createTheme()).replace(/(\[data-theme="dark"\][^{]*\{[^}]*--ds-text-subtle:\s*)[^;]+;/, "$1#2a2a28;");
    const failing = checkThemeCss(css).checks.filter((check) => !check.pass);
    expect(failing.length).toBeGreaterThan(0);
    expect(failing.every((check) => check.mode === "dark" && check.foreground === "ds-text-subtle")).toBe(true);
  });

  it("reports a token a pair needs that the CSS does not define", () => {
    const css = toCSS(createTheme()).replace(/--ds-link:[^;]+;/g, "");
    const report = checkThemeCss(css);
    expect(report.missing).toEqual(expect.arrayContaining([{ mode: "light", token: "ds-link" }, { mode: "dark", token: "ds-link" }]));
  });
});
