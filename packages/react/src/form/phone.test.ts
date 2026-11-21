import { afterEach, describe, expect, it } from "vitest";

import { registerLocaleAliases } from "../intl-locale";
import { COUNTRIES, DIAL_CODES } from "./countries";
import {
  PHONE_COUNTRIES,
  caretAfterDigits,
  countryName,
  digitCountBefore,
  digitIndexForSeparatorKey,
  digitsOf,
  findCountry,
  formatNational,
  formatPhone,
  isCompleteNational,
  isSubmittedPhone,
  localeCountry,
  nationalDigits,
  parsePhone,
  toE164,
} from "./phone";

describe("the phone field's country table", () => {
  it("is sorted by ISO code and carries each row's dial code", () => {
    const isos = PHONE_COUNTRIES.map((country) => country.iso);
    expect(isos).toEqual([...isos].sort());
    expect(PHONE_COUNTRIES.find((country) => country.iso === "ME")).toEqual({
      iso: "ME",
      dial: "382",
      groups: [2, 3, 3],
      min: 8,
      max: 8,
      trunkPrefix: "0",
    });
  });

  it("gives every country a shape that adds up", () => {
    for (const country of PHONE_COUNTRIES) {
      const total = country.groups.reduce((sum, size) => sum + size, 0);
      expect(total, country.iso).toBeGreaterThanOrEqual(country.min);
      expect(total, country.iso).toBeLessThanOrEqual(country.max);
      expect(country.min, country.iso).toBeLessThanOrEqual(country.max);
    }
  });

  it("lists no dial code twice under the same country", () => {
    const isos = PHONE_COUNTRIES.map((country) => country.iso);
    expect(new Set(isos).size).toBe(isos.length);
  });
});

describe("the country a field opens on", () => {
  // The alias registry has no reset: mapping the tag back to itself is the closest undo.
  afterEach(() => registerLocaleAliases({ me: "me" }));

  it("takes the region a bare language most likely means", () => {
    expect(localeCountry("en")).toBe("US");
    expect(localeCountry("tr")).toBe("TR");
  });

  it("takes the region the locale names", () => {
    expect(localeCountry("de-AT")).toBe("AT");
  });

  it("falls back to US for a private tag Intl cannot read", () => {
    expect(localeCountry("app_internal")).toBe("US");
    expect(localeCountry("x-private")).toBe("US");
  });

  it("falls back to US for a tag Intl reads but gives no region", () => {
    expect(localeCountry("me")).toBe("US");
  });

  it("takes the region of an alias the app registered", () => {
    registerLocaleAliases({ me: "sr-Latn-ME" });
    expect(localeCountry("me")).toBe("ME");
    expect(localeCountry("me-ME")).toBe("ME");
  });
});

describe("grouping a national number", () => {
  it("spaces a Turkish number the way it is spoken", () => {
    expect(formatNational("5393407624", findCountry("TR"))).toBe("539 340 76 24");
  });

  it("spaces a Montenegrin number the way it is spoken", () => {
    expect(formatNational("69123456", findCountry("ME"))).toBe("69 123 456");
    expect(formatNational("67123456", findCountry("ME"))).toBe("67 123 456");
  });

  it("formats what is typed so far, with no trailing space", () => {
    const tr = findCountry("TR");
    expect(formatNational("5", tr)).toBe("5");
    expect(formatNational("539", tr)).toBe("539");
    expect(formatNational("5393", tr)).toBe("539 3");
    expect(formatNational("539340", tr)).toBe("539 340");
    for (const partial of ["5", "53", "539", "5393", "53934", "539340", "5393407"]) {
      expect(formatNational(partial, tr).endsWith(" ")).toBe(false);
    }

    const me = findCountry("ME");
    expect(formatNational("6", me)).toBe("6");
    expect(formatNational("67", me)).toBe("67");
    expect(formatNational("671", me)).toBe("67 1");
    expect(formatNational("67123", me)).toBe("67 123");
    expect(formatNational("671234", me)).toBe("67 123 4");
  });

  it("keeps digits past the last group instead of dropping them", () => {
    expect(formatNational("69123456789", findCountry("ME"))).toBe("69 123 456 789");
  });

  it("ignores whatever a person types between the digits", () => {
    expect(digitsOf("+90 (539) 340-76-24")).toBe("905393407624");
    expect(formatNational("539-340-7624", findCountry("TR"))).toBe("539 340 76 24");
  });

  it("groups an unlisted country in threes rather than giving up", () => {
    expect(formatNational("123456789012", undefined)).toBe("123 456 789 012");
  });
});

describe("caret mapping after regroup", () => {
  const me = findCountry("ME")!;

  it("maps the mid-delete onto the remaining group, not the end", () => {
    expect(formatNational("68524824", me)).toBe("68 524 824");
    expect(digitCountBefore("68 24 824", 3)).toBe(2);
    expect(formatNational("6824824", me)).toBe("68 248 24");
    expect(caretAfterDigits("68 248 24", 2)).toBe(3);
    expect("68 248 24".length).toBe(9);
  });

  it("keeps the caret after an inserted middle digit", () => {
    expect(digitCountBefore("68 52 824", 5)).toBe(4);
    expect(caretAfterDigits("68 524 824", 4)).toBe(5);
  });

  it("stays at the end when every remaining digit is to the left", () => {
    expect(digitCountBefore("68 524 824", 10)).toBe(8);
    expect(caretAfterDigits("68 524 824", 8)).toBe(10);
  });
});

describe("separator delete", () => {
  it("treats the space before the last group as the previous digit on Backspace", () => {
    expect(formatNational("213123", findCountry("ME"))).toBe("21 312 3");
    expect(digitIndexForSeparatorKey("21 312 3", 7, "Backspace")).toBe(4);
    const next = "213123".slice(0, 4) + "213123".slice(5);
    expect(formatNational(next, findCountry("ME"))).toBe("21 313");
    expect(caretAfterDigits("21 313", 4)).toBe(5);
    expect(digitCountBefore("21 312 3", 7)).toBe(5);
  });

  it("treats Delete on that space as the following digit", () => {
    expect(digitIndexForSeparatorKey("21 312 3", 6, "Delete")).toBe(5);
    expect(digitIndexForSeparatorKey("21 312 3", 7, "Delete")).toBeNull();
    expect(digitIndexForSeparatorKey("21 312 3", 5, "Backspace")).toBeNull();
  });
});

describe("the two spellings of a number", () => {
  it("reads with spaces and stores without", () => {
    const tr = findCountry("TR");
    expect(formatPhone("5393407624", tr)).toBe("+90 539 340 76 24");
    expect(toE164("5393407624", tr)).toBe("+905393407624");
    const me = findCountry("ME");
    expect(formatPhone("67123456", me)).toBe("+382 67 123 456");
    expect(toE164("67123456", me)).toBe("+38267123456");
  });

  it("stores nothing for an empty number", () => {
    expect(toE164("", findCountry("TR"))).toBe("");
  });

  it("shows the dial code before any digits are typed", () => {
    expect(formatPhone("", findCountry("TR"))).toBe("+90");
  });
});

describe("completeness", () => {
  it("accepts a full number and refuses a short one", () => {
    const tr = findCountry("TR");
    expect(isCompleteNational("5393407624", tr)).toBe(true);
    expect(isCompleteNational("53934076", tr)).toBe(false);
    expect(isCompleteNational("53934076241", tr)).toBe(false);
  });

  it("accepts either length where a country issues both", () => {
    const rs = findCountry("RS");
    expect(isCompleteNational("63123456", rs)).toBe(true);
    expect(isCompleteNational("631234567", rs)).toBe(true);
  });
});

describe("restoring a saved draft", () => {
  it("splits a stored number back into country and digits", () => {
    expect(parsePhone("+905393407624")).toEqual({
      country: findCountry("TR"),
      national: "5393407624",
    });
    expect(parsePhone("+38267123456")).toEqual({
      country: findCountry("ME"),
      national: "67123456",
    });
  });

  it("matches the longest dial code, not the first that fits", () => {
    expect(parsePhone("+380671234567").country?.iso).toBe("UA");
    expect(parsePhone("+38269123456").country?.iso).toBe("ME");
    expect(parsePhone("+381631234567").country?.iso).toBe("RS");
  });

  it("hands back the digits when it recognises no country", () => {
    expect(parsePhone("+9995551234")).toEqual({
      country: undefined,
      national: "9995551234",
    });
    expect(parsePhone("")).toEqual({ country: undefined, national: "" });
  });

  it("parses a number from a country outside the formatting table", () => {
    const japan = parsePhone("+819012345678");
    expect(japan.country?.iso).toBe("JP");
    expect(japan.national).toBe("9012345678");
  });
});

describe("every offered country produces a usable number", () => {
  it("gives a dialling code to a country outside the formatting table", () => {
    const japan = findCountry("JP");
    expect(japan, "JP resolved to nothing").toBeDefined();
    expect(japan!.dial).toBe(DIAL_CODES.JP);
  });

  it("never writes a number without a country code", () => {
    for (const country of COUNTRIES) {
      const resolved = findCountry(country.code);
      expect(resolved, `${country.code} resolved to nothing`).toBeDefined();
      const e164 = toE164("5551234567", resolved);
      expect(e164, `${country.code} produced a code-less number`).toMatch(
        /^\+\d{1,4}\d+$/,
      );
      expect(e164.startsWith(`+${DIAL_CODES[country.code]}`)).toBe(true);
    }
  });

  it("still refuses a code that belongs to no country", () => {
    expect(findCountry("ZZ")).toBeUndefined();
    expect(findCountry("")).toBeUndefined();
  });
});

describe("country names come from the runtime, not from another translation table", () => {
  it("names a country in the reader's own language", () => {
    expect(countryName("ME", "en")).toBe("Montenegro");
    expect(countryName("TR", "tr")).toBe("Türkiye");
  });

  it("falls back to the code rather than losing the picker", () => {
    expect(countryName("ME", "not-a-locale")).toBeTruthy();
  });
});

describe("submit and selected-country helpers", () => {
  it("strips the selected country's dial without guessing", () => {
    const me = findCountry("ME")!;
    expect(nationalDigits("+38267123456", me)).toBe("67123456");
    expect(nationalDigits("", me)).toBe("");
  });

  it("rejects an E.164 value longer than 15 digits", () => {
    expect(isSubmittedPhone("+38267123456")).toBe(true);
    expect(isSubmittedPhone("+382" + "1".repeat(16))).toBe(false);
  });
});
