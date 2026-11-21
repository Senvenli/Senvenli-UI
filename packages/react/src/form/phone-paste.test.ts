import { describe, expect, it } from "vitest";

import { digitsOf } from "./phone";
import { internationalPasteDigits } from "./phone-paste";

describe("internationalPasteDigits: one rule for every phone field", () => {
  it.each([
    ["ASCII plus", "+382 68 555 444"],
    ["full-width plus and digits (Japanese IME)", "＋３８２ ６８ ５５５ ４４４"],
    ["full-width plus, ASCII digits", "＋382 68 555 444"],
    ["small plus", "﹢382 68 555 444"],
    ["ASCII zeros", "00382 68 555 444"],
    ["full-width zeros", "００３８２ ６８ ５５５ ４４４"],
    ["Arabic-Indic zeros", "٠٠٣٨٢ ٦٨ ٥٥٥ ٤٤٤"],
    ["Extended Arabic-Indic zeros", "۰۰۳۸۲ ۶۸ ۵۵۵ ۴۴۴"],
    ["surrounding space", "  +382 68 555 444  "],
  ])("%s: the digits after the prefix", (_, pasted) => {
    expect(internationalPasteDigits(pasted)).toBe("38268555444");
  });

  it("a national number is not international", () => {
    expect(internationalPasteDigits("068 555 444")).toBeNull();
    expect(internationalPasteDigits("68 555 444")).toBeNull();
    expect(internationalPasteDigits("0 68 555 444")).toBeNull();
    expect(internationalPasteDigits("")).toBeNull();
  });

  it("NFKC only recognises the plus: superscripts, circled numbers and fractions are never digits, as in digitsOf", () => {
    expect(internationalPasteDigits("+382 ²68 ①555 ½444")).toBe("38268555444");
    expect(internationalPasteDigits("+382 ²68 ①555 ½444")).toBe(digitsOf("+382 ²68 ①555 ½444"));
    // "⁰⁰" and "⓪⓪" read as "00" under NFKC but are not decimal digits: not an international prefix.
    expect(internationalPasteDigits("⁰⁰382 68 555 444")).toBeNull();
    expect(internationalPasteDigits("⓪⓪382 68 555 444")).toBeNull();
  });
});
