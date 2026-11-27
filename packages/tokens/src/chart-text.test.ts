// @vitest-environment node
import { describe, expect, it } from "vitest";

import { contrast, mixOklab, type OKLCH } from "./color.js";
import { createTheme } from "./theme.js";

const PRIMARIES = [undefined, "#996a00", "#2f6fed", "#d4380d", "#0e9f6e", "#7c3aed", "#facc15"];

describe("figures on a heatmap's strongest steps", () => {
  it("ds-chart-heat is chart-1 mixed 65% into the selected fill, as CSS color-mix(in oklab) draws it", () => {
    for (const mode of ["light", "dark"] as const) {
      const t = createTheme()[mode];
      const expected = mixOklab(t["ds-chart-1"] as OKLCH, t["ds-background-selected-pressed"] as OKLCH, 0.65);
      expect(t["ds-chart-heat"]).toEqual(expected);
    }
  });

  it("ds-text-on-chart and ds-text-on-chart-heat read at AA on their fills, for any primary, light and dark", () => {
    for (const primary of PRIMARIES) {
      const theme = createTheme(primary ? { primary } : {});
      for (const mode of ["light", "dark"] as const) {
        const t = theme[mode];
        expect(contrast(t["ds-text-on-chart"] as OKLCH, t["ds-chart-1"] as OKLCH), `${primary} ${mode} chart-1`).toBeGreaterThanOrEqual(4.5);
        expect(contrast(t["ds-text-on-chart-heat"] as OKLCH, t["ds-chart-heat"] as OKLCH), `${primary} ${mode} heat`).toBeGreaterThanOrEqual(4.5);
      }
      // And the engine reports both pairs among its checks.
      const pairs = theme.checks.filter((check) => check.foreground === "ds-text-on-chart" || check.foreground === "ds-text-on-chart-heat");
      expect(pairs).toHaveLength(4);
      expect(pairs.every((check) => check.pass)).toBe(true);
    }
  });
});
