import { describe, expect, it } from "vitest";
import { closeLabel, dateIncompleteLabel, hasDsStrings, monthHasDaysLabel, optionalLabel, registerDsStrings, strengthLabels, stepOfLabel, thisMonthLabel } from "./i18n";
import { intlLocale, registerLocaleAliases } from "./intl-locale";
import { cn } from "./utils";

describe("component strings", () => {
  it("speaks English by default and falls back to it", () => {
    expect(closeLabel("en")).toBe("Close");
    expect(closeLabel("en-GB")).toBe("Close");
    expect(closeLabel("xx")).toBe("Close");
    expect(hasDsStrings("en")).toBe(true);
    expect(hasDsStrings("xx")).toBe(false);
  });

  it("uses strings an app registers, by exact tag or language", () => {
    registerDsStrings("tr", { close: "Kapat", strength: ["Zayıf", "Orta", "Güçlü"] });
    expect(closeLabel("tr")).toBe("Kapat");
    expect(closeLabel("tr-TR")).toBe("Kapat");
    expect(strengthLabels("tr")).toEqual(["Zayıf", "Orta", "Güçlü"]);
    expect(optionalLabel("tr")).toBe("(optional)");
    expect(hasDsStrings("tr-TR")).toBe(true);
  });

  it("formats counts in sentences with the locale's numbers", () => {
    expect(stepOfLabel("en", 2, 1200)).toContain("1,200");
  });

  it("contains no product-specific copy", async () => {
    const { DS_STRINGS } = await import("./i18n");
    const all = JSON.stringify(DS_STRINGS);
    expect(all).not.toMatch(/rentsen/i);
  });
});

describe("locale aliases", () => {
  it("passes tags through unless an alias is registered", () => {
    expect(intlLocale("de-AT")).toBe("de-AT");
    registerLocaleAliases({ me: "sr-Latn-ME" });
    expect(intlLocale("me")).toBe("sr-Latn-ME");
  });
});

describe("cn", () => {
  it("keeps a text color beside a type style", () => {
    expect(cn("text-ds-link", "text-body-strong")).toBe("text-ds-link text-body-strong");
  });

  it("lets the caller's height win over the control height", () => {
    expect(cn("h-control", "h-auto")).toBe("h-auto");
  });
});

describe("registered languages and aliases", () => {
  it("never throws for a month-length message in a language without that sentence, and stays English", () => {
    registerDsStrings("fi", { close: "Sulje" });
    expect(monthHasDaysLabel("fi", 30, 11)).toBe("November has 30 days.");
    expect(monthHasDaysLabel("fi", 30)).toBe(monthHasDaysLabel("en", 30));
  });

  it("uses a registered sentence with registered month names, or the locale's own from Intl", () => {
    registerDsStrings("pl", { monthHasDays: "{month} ma {n} dni.", months: ["styczeń", "luty", "marzec", "kwiecień", "maj", "czerwiec", "lipiec", "sierpień", "wrzesień", "październik", "listopad", "grudzień"] });
    expect(monthHasDaysLabel("pl", 30, 11)).toBe("listopad ma 30 dni.");
    registerDsStrings("de", { monthHasDays: "Der {month} hat {n} Tage." });
    expect(monthHasDaysLabel("de", 30, 11)).toBe("Der November hat 30 Tage.");
  });

  it("finds an app locale's strings through the tag it is aliased to", () => {
    registerLocaleAliases({ "x-app": "sr-Latn-ME" });
    registerDsStrings("x-app", { thisMonth: "Ovaj mjesec" });
    expect(thisMonthLabel("sr-Latn-ME")).toBe("Ovaj mjesec");
    expect(thisMonthLabel("x-app")).toBe("Ovaj mjesec");
  });

  it("joins registered date parts with the registered list words", () => {
    registerDsStrings("nl", {
      dateIncomplete: "Datum onvolledig: vul {parts} in, of maak het veld leeg.",
      dateParts: { day: "de dag", month: "de maand", year: "het jaar", hour: "het uur", minute: "de minuten", second: "de seconden", dayPeriod: "AM/PM" },
      listAnd: [" en ", " en "],
    });
    expect(dateIncompleteLabel("nl", ["day", "month"])).toBe("Datum onvolledig: vul de dag en de maand in, of maak het veld leeg.");
  });
});
