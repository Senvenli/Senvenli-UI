import { describe, expect, it } from "vitest";

import { COUNTRIES, DIAL_CODES, countryByCode } from "./countries";

/**
 * The country list is the single source of truth for country dropdowns, and it
 * carries dialling codes too so a phone-country picker can offer all of them
 * rather than a curated handful.
 *
 * Two failure modes matter here and neither shows up as a crash. A country
 * without a dialling code renders a blank beside its name; a dialling code
 * without a country is dead data nothing can reach. Both are quiet, so both
 * are asserted.
 */
describe("COUNTRIES", () => {
  it("is sorted by name, which is the order a picker shows", () => {
    // A picker that renders the array as given has no sort at the call site,
    // so alphabetical order is a property of this file or of nothing.
    const names = COUNTRIES.map((c) => c.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "en")));
  });

  it("has no duplicate codes", () => {
    const codes = COUNTRIES.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("includes Kosovo, although its code is not official ISO 3166-1", () => {
    // `XK` is user-assigned rather than official ISO 3166-1, which is how a
    // list generated from the standard loses it. The country and its +383
    // exist whatever the standard says.
    expect(COUNTRIES.find((c) => c.code === "XK")?.name).toBe("Kosovo");
    expect(countryByCode("xk")?.name).toBe("Kosovo");
    expect(DIAL_CODES.XK).toBe("383");
  });
});

describe("DIAL_CODES", () => {
  it("covers every country, and only countries", () => {
    const codes = COUNTRIES.map((c) => c.code);
    const dialled = Object.keys(DIAL_CODES);

    const missing = codes.filter((c) => !(c in DIAL_CODES));
    const orphaned = dialled.filter((c) => !codes.includes(c));

    expect(missing, `countries with no dialling code: ${missing.join(", ")}`).toEqual([]);
    expect(orphaned, `dialling codes with no country: ${orphaned.join(", ")}`).toEqual([]);
  });

  it("holds digits only, with no leading plus", () => {
    // The plus is presentation. Storing it here would put it in the stored
    // value at one call site and not another.
    for (const [code, dial] of Object.entries(DIAL_CODES)) {
      expect(dial, `${code} is not bare digits`).toMatch(/^[1-9]\d{0,3}$/);
    }
  });

  it("agrees with an independently curated set of twenty", () => {
    // These twenty were curated by hand, independently of the wide table.
    // Checking the table against them is the closest thing to an external
    // source available here: if the wide list had been guessed rather than
    // known, this is where it would show.
    const known: Record<string, string> = {
      ME: "382", RS: "381", BA: "387", HR: "385", AL: "355",
      MK: "389", XK: "383", SI: "386", TR: "90", DE: "49",
      AT: "43", CH: "41", IT: "39", FR: "33", GB: "44",
      NL: "31", PL: "48", UA: "380", RU: "7", US: "1",
    };
    for (const [iso, dial] of Object.entries(known)) {
      expect(DIAL_CODES[iso], `${iso}`).toBe(dial);
    }
  });

  it("repeats a shared code rather than pretending it is unique", () => {
    // The NANP and the Russian/Kazakh +7 are real. A map that deduplicated
    // them would have to drop countries; this one answers per country, which
    // is the question a picker asks.
    expect(DIAL_CODES.US).toBe("1");
    expect(DIAL_CODES.CA).toBe("1");
    expect(DIAL_CODES.RU).toBe("7");
    expect(DIAL_CODES.KZ).toBe("7");
  });
});
