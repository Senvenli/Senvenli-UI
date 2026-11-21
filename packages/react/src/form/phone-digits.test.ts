import { describe, expect, it } from "vitest";

import { digitCountBefore, digitsOf, parsePhone, toE164, findCountry } from "./phone";

describe("digitsOf: any script's decimal digits, as ASCII", () => {
  it.each([
    ["ASCII", "0123456789"],
    ["full-width (Japanese IME)", "０１２３４５６７８９"],
    ["Arabic-Indic", "٠١٢٣٤٥٦٧٨٩"],
    ["Extended Arabic-Indic", "۰۱۲۳۴۵۶۷۸۹"],
    ["Devanagari", "०१२३४५६७८९"],
    ["Bengali", "০১২৩৪৫৬৭৮৯"],
    ["Thai", "๐๑๒๓๔๕๖๗๘๙"],
    ["mathematical bold (astral, sets back to back)", "𝟎𝟏𝟐𝟑𝟒𝟓𝟔𝟕𝟖𝟗"],
    ["mathematical monospace (the fifth set in its run)", "𝟶𝟷𝟸𝟹𝟺𝟻𝟼𝟽𝟾𝟿"],
  ])("%s", (_, digits) => {
    expect(digitsOf(digits)).toBe("0123456789");
  });

  it("decoration between digits still goes, in any mix of scripts", () => {
    expect(digitsOf("＋９０ (５３２) ٣٤٠-۷۶-24")).toBe("905323407624");
  });

  it("letters and other numbers that are not decimal digits are not digits (½, Ⅻ, ²)", () => {
    expect(digitsOf("½Ⅻ²a")).toBe("");
  });

  it("digitCountBefore counts a digit of any script as one digit", () => {
    expect(digitCountBefore("６８ ٥٥٥", 4)).toBe(3);
  });

  it("a stored or typed number in another script parses to the same E.164", () => {
    expect(parsePhone("＋９０５３２１２３４５６７")).toEqual(parsePhone("+905321234567"));
    expect(toE164("٦٨٥٥٥٤٤٤", findCountry("ME"))).toBe("+38268555444");
  });
});
