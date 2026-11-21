import { afterEach, describe, expect, it } from "vitest";

import { registerLocaleAliases } from "../intl-locale";
import { COUNTRIES } from "./countries";
import { phoneCountries, phoneDisplayLocale } from "./phone";

const names = (locale: string) => phoneCountries(locale).map((c) => c.name);

/**
 * The phone field's own country list: localised names, sorted by the name the
 * reader sees, in the reader's collation. Sorting by ISO code puts Yunanistan
 * (GR) between Ekvator Ginesi (GQ) and Guatemala (GT) in Turkish.
 */
describe("phoneCountries", () => {
  it("offers every catalog country once, as a code and a name", () => {
    for (const locale of ["tr", "en", "me"]) {
      const list = phoneCountries(locale);
      expect(list).toHaveLength(COUNTRIES.length);
      expect(new Set(list.map((c) => c.code)).size).toBe(COUNTRIES.length);
      expect(Object.keys(list.find((c) => c.code === "ME")!).sort()).toEqual(["code", "name"]);
    }
  });

  it("names and sorts in Turkish: Tunus before Türkiye, not by ISO code", () => {
    const tr = names("tr");
    expect(tr).toContain("Karadağ");
    expect(tr.indexOf("Tunus")).toBeLessThan(tr.indexOf("Türkiye"));
    expect(tr.indexOf("Türkiye")).toBeLessThan(tr.indexOf("Türkmenistan"));
    // ISO order put GR between GQ and GT; by name Yunanistan sits near the end.
    expect(tr.indexOf("Guatemala")).toBeLessThan(tr.indexOf("Yunanistan"));
    expect(tr.indexOf("Ekvator Ginesi")).toBeLessThan(tr.indexOf("Guatemala"));
    expect(tr).toEqual([...tr].sort(new Intl.Collator("tr").compare));
  });

  it("names and sorts in English", () => {
    const en = names("en");
    expect(en).toContain("Montenegro");
    expect(en.indexOf("Tunisia")).toBeLessThan(en.indexOf("Türkiye"));
    expect(en).toEqual([...en].sort(new Intl.Collator("en").compare));
  });
});

describe("phoneCountries with an app's own locale tag", () => {
  // The alias registry has no reset: mapping the tag back to itself is the closest undo.
  afterEach(() => registerLocaleAliases({ me: "me" }));

  it("hands a tag with no alias to Intl as it is", () => {
    expect(phoneDisplayLocale("tr")).toBe("tr");
    expect(phoneDisplayLocale("me")).toBe("me");
  });

  it("names and sorts in Montenegrin once the app registers an alias, not in the English fallback", () => {
    registerLocaleAliases({ me: "sr-Latn-BA-x-me" });
    expect(phoneDisplayLocale("me")).toBe("sr-Latn-BA-x-me");
    expect(phoneDisplayLocale("tr")).toBe("tr");
    const me = names("me");
    expect(me).toContain("Crna Gora");
    expect(me).not.toContain("Montenegro");
    expect(me).toEqual([...me].sort(new Intl.Collator("sr-Latn-BA-x-me").compare));
  });
});
