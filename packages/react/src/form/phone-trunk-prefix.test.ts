import { describe, expect, it } from "vitest";

import { digitsOf, findCountry, PHONE_COUNTRIES, type PhoneCountry } from "./phone";
import { stripTrunkPrefix } from "./phone-paste";

const country = (iso: string) => findCountry(iso)!;

describe("trunk prefixes in the phone table", () => {
  it("records each table country's sourced prefix: '0', '8', '1' or none", () => {
    // Sources are cited next to the data in ./phone.ts; this pins the values to them.
    const recorded = Object.fromEntries(PHONE_COUNTRIES.map((item) => [item.iso, item.trunkPrefix]));
    expect(recorded).toEqual({
      ME: "0", RS: "0", BA: "0", HR: "0", AL: "0", MK: "0", XK: "0", SI: "0", TR: "0", DE: "0", AT: "0",
      CH: "0", IT: null, FR: "0", GB: "0", NL: "0", PL: null, UA: "0", RU: "8", US: "1",
    });
    expect(PHONE_COUNTRIES.filter((item) => item.trunkPrefixStartsNumbers).map((item) => item.iso)).toEqual(["RU"]);
  });

  it("a country outside the table has an unknown prefix", () => {
    expect(country("JP").trunkPrefix).toBeUndefined();
    expect(country("KZ").trunkPrefix).toBeUndefined();
  });
});

describe("stripTrunkPrefix", () => {
  // Class "0", one length.
  it("Montenegro: 068 555 444 is 68 555 444", () => {
    expect(stripTrunkPrefix("068555444", country("ME"))).toBe("68555444");
  });

  it("strips the 0 for every '0' country once the rest reaches its shortest number", () => {
    for (const item of PHONE_COUNTRIES.filter((row) => row.trunkPrefix === "0")) {
      const national = "2".repeat(item.min);
      expect(stripTrunkPrefix(`0${national}`, item), item.iso).toBe(national);
      // One digit short: the 0 stays until the digit that completes the number.
      expect(stripTrunkPrefix(`0${national.slice(1)}`, item), item.iso).toBe(`0${national.slice(1)}`);
    }
  });

  it("variable lengths: Serbia strips at its shortest (8) and keeps the longest (9)", () => {
    expect(stripTrunkPrefix("06012345", country("RS"))).toBe("06012345");
    expect(stripTrunkPrefix("060123456", country("RS"))).toBe("60123456");
    expect(stripTrunkPrefix("0601234567", country("RS"))).toBe("601234567");
  });

  // Class none: the 0 is part of the number.
  it("Italy keeps its 0: 06 1234 5678", () => {
    expect(stripTrunkPrefix("0612345678", country("IT"))).toBe("0612345678");
  });

  it("Poland has none since 2009: a leading 0 is not taken as one", () => {
    expect(stripTrunkPrefix("0221234567", country("PL"))).toBe("0221234567");
  });

  // Class unknown: nothing is stripped.
  it("Countries outside the table keep every digit", () => {
    expect(stripTrunkPrefix("09012345678", country("JP"))).toBe("09012345678");
    expect(stripTrunkPrefix("068555444", undefined)).toBe("068555444");
  });

  // Class "1": NANP numbers never begin with 1.
  it("United States: 1 212 555 1234 is 212 555 1234", () => {
    expect(stripTrunkPrefix("12125551234", country("US"))).toBe("2125551234");
    expect(stripTrunkPrefix("2125551234", country("US"))).toBe("2125551234");
  });

  // Class ambiguous "8": Russian numbers also begin with 8.
  it("Russia: 8 912 345 67 89 is 912 345 67 89", () => {
    expect(stripTrunkPrefix("89123456789", country("RU"))).toBe("9123456789");
    expect(stripTrunkPrefix("88121234567", country("RU"))).toBe("8121234567");
  });

  it("Russia: a whole number that begins with 8 (812 St Petersburg, 800 freephone) is never cut", () => {
    expect(stripTrunkPrefix("8121234567", country("RU"))).toBe("8121234567");
    expect(stripTrunkPrefix("8001234567", country("RU"))).toBe("8001234567");
    expect(stripTrunkPrefix("812123456", country("RU"))).toBe("812123456");
  });

  it("strips only the recorded prefix, once", () => {
    expect(stripTrunkPrefix("0068555444", country("ME"))).toBe("068555444");
    expect(stripTrunkPrefix("868555444", country("ME"))).toBe("868555444");
    expect(stripTrunkPrefix("", country("ME"))).toBe("");
  });

  it.each([
    ["Arabic-Indic", "٠٦٨٥٥٥٤٤٤"],
    ["Extended Arabic-Indic", "۰۶۸۵۵۵۴۴۴"],
    ["full-width", "０６８５５５４４４"],
    ["Devanagari", "०६८५५५४४४"],
  ])("%s digits read through digitsOf strip the same way", (_, typed) => {
    expect(stripTrunkPrefix(digitsOf(typed), country("ME"))).toBe("68555444");
  });

  it("a synthesised shape with a prefix still honours its own lengths", () => {
    const shape: PhoneCountry = { iso: "ZZ", dial: "999", groups: [3, 3], min: 6, max: 6, trunkPrefix: "0" };
    expect(stripTrunkPrefix("0123456", shape)).toBe("123456");
    expect(stripTrunkPrefix("012345", shape)).toBe("012345");
  });
});
