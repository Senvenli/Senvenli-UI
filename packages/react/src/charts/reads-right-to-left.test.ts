import { describe, expect, it } from "vitest";

import { readsRightToLeft } from "./axis-width";

/**
 * readsRightToLeft: UAX #9's rule P2, with isolates passed over, and the DS's one extension of it, each pinned on
 * its own.
 */
describe("readsRightToLeft: P2 and its extension", () => {
  it("P2: the first character of class L, R or AL decides; figures, signs and punctuation decide nothing", () => {
    expect(readsRightToLeft("150 ترليون")).toBe(true);
    expect(readsRightToLeft("€ 50 ترليون")).toBe(true);
    expect(readsRightToLeft("‏1.5E14 €")).toBe(true);
    expect(readsRightToLeft("؜-1.5")).toBe(true);
    expect(readsRightToLeft("סניף 2")).toBe(true);
    expect(readsRightToLeft("€ 1.450.000 net")).toBe(false);
    expect(readsRightToLeft("‎-150 ترليون")).toBe(false);
    expect(readsRightToLeft("१५० खरब")).toBe(false);
    expect(readsRightToLeft("€ 1.450.000")).toBe(false);
    expect(readsRightToLeft("%12,4")).toBe(false);
  });

  it("P2: what an isolate holds is passed over, to its PDI or, without one, to the end", () => {
    expect(readsRightToLeft("⁦North⁩ فرع")).toBe(true);
    expect(readsRightToLeft("⁧فرع⁩ North")).toBe(false);
    expect(readsRightToLeft("⁨فرع⁩ ⁨North⁩")).toBe(false);
    expect(readsRightToLeft("⁨⁧فرع⁩ North⁩ فرع")).toBe(true);
    expect(readsRightToLeft("⁦فرع")).toBe(false);
    // A PDI with no isolate open closes nothing.
    expect(readsRightToLeft("⁩فرع")).toBe(true);
    // An isolated figure decides nothing either.
    expect(readsRightToLeft("⁨١٥٠⁩ km")).toBe(false);
  });

  it("the extension: an Arabic-Indic or Extended Arabic-Indic figure, or an Arabic number sign, before any strong character", () => {
    expect(readsRightToLeft("١٥٠")).toBe(true);
    expect(readsRightToLeft("١٬٤٥٠٬٠٠٠")).toBe(true);
    expect(readsRightToLeft("۱۵۰")).toBe(true);
    expect(readsRightToLeft("۱۲٫۵ km")).toBe(true);
    expect(readsRightToLeft("€ ۱٬۴۵۰")).toBe(true);
    expect(readsRightToLeft("؀١٥")).toBe(true);
    // After a strong character it decides nothing: P2 already has.
    expect(readsRightToLeft("km ۱۵۰")).toBe(false);
    expect(readsRightToLeft("‎−۱۲")).toBe(false);
    // European figures are not in it.
    expect(readsRightToLeft("150 km")).toBe(false);
  });
});
