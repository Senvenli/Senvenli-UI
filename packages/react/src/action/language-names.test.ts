import { describe, expect, it } from "vitest";

import { registerLocaleAliases } from "../intl-locale";
import { capitalizeLanguageName, languageName, languageOptions, registerLanguageNames } from "./index";

// The name registry and the alias table are module state with no reset, and both match a full tag by its
// language part too. So every test that registers something uses UI tags (and alias sources) no other test in
// this file reads: "nl"/"nl-BE" for the precedence test, "qaa" for the registered endonym, "zz" for the alias.
// Nothing is ever registered under "en", "de", "fr", "tr" or "cs", which the Intl tests rely on.

describe("languageName from Intl", () => {
  it("names a language in the UI language", () => {
    expect(languageName("de", "en")).toBe("German");
    expect(languageName("de", "de")).toBe("Deutsch");
    expect(languageName("en", "de")).toBe("Englisch");
  });

  it("names a region in brackets (languageDisplay: standard), not as a dialect", () => {
    expect(languageName("pt-BR", "en")).toBe("Portuguese (Brazil)");
    expect(languageName("pt-BR", "en")).not.toBe("Brazilian Portuguese");
    expect(languageName("de-AT", "en")).toBe("German (Austria)");
  });

  it("falls back to the tag when nothing names it", () => {
    // "qab" is a private-use language code: no registered name, no Intl name, no endonym.
    // Compared without case: the fallback goes through the same capitalization as a name.
    expect(languageName("qab", "en").toLowerCase()).toBe("qab");
  });
});

describe("languageName capitalization", () => {
  it("capitalizes the first letter where Intl writes the name in lower case", () => {
    // French writes language names in lower case ("allemand"); a list entry starts with a capital.
    expect(new Intl.DisplayNames(["fr"], { type: "language" }).of("de")).toBe("allemand");
    expect(languageName("de", "fr")).toBe("Allemand");
    expect(languageName("fr", "fr")).toBe("Français");
    expect(languageName("pt-BR", "fr")).toBe("Portugais (Brésil)");
  });

  it("capitalizes by the UI language's own rules: a dotted capital İ in Turkish", () => {
    expect(languageName("en", "tr")).toBe("İngilizce");
    // The rule itself: the same word gets a different capital in Turkish than in English.
    expect(capitalizeLanguageName("ingilizce", "tr")).toBe("İngilizce");
    expect(capitalizeLanguageName("ingilizce", "en")).toBe("Ingilizce");
  });

  it("changes the first letter only", () => {
    expect(capitalizeLanguageName("norsk bokmål", "nb")).toBe("Norsk bokmål");
    expect(capitalizeLanguageName("Deutsch", "de")).toBe("Deutsch");
    expect(capitalizeLanguageName("", "en")).toBe("");
  });
});

describe("registerLanguageNames", () => {
  it("prefers a name registered for the full UI tag over one for its language, and both over Intl", () => {
    registerLanguageNames("nl", { de: "Duits (language)", en: "Engels (language)" });
    registerLanguageNames("nl-BE", { de: "Duits (full tag)" });

    expect(languageName("de", "nl-BE")).toBe("Duits (full tag)");
    // Not registered for the full tag: the language's table answers.
    expect(languageName("en", "nl-BE")).toBe("Engels (language)");
    // Another region of the same language never sees the full tag's names.
    expect(languageName("de", "nl-NL")).toBe("Duits (language)");
    expect(languageName("de", "nl")).toBe("Duits (language)");
    // Registered in neither table: Intl.
    expect(languageName("fr", "nl-BE")).toBe("Frans");
    // Tags match without regard to case.
    expect(languageName("DE", "NL-be")).toBe("Duits (full tag)");
  });
});

describe("languageName without Intl data for the UI language", () => {
  it("shows each language's own name, never the host's language", () => {
    // "qaa" is a valid tag no runtime has data for, so Intl would answer in the host's language.
    expect(Intl.DateTimeFormat.supportedLocalesOf(["qaa"])).toEqual([]);
    expect(languageName("de", "qaa")).toBe("Deutsch");
    expect(languageName("fr", "qaa")).toBe("Français");
    expect(languageName("en", "qaa")).toBe("English");
  });

  it("does the same for a tag Intl rejects", () => {
    expect(() => new Intl.DisplayNames(["x-zz"], { type: "language" })).toThrow();
    expect(languageName("de", "x-zz")).toBe("Deutsch");
  });

  it("uses a registered endonym for a language Intl cannot name", () => {
    // Registered under the language itself, so it is that language's own name.
    registerLanguageNames("qac", { qac: "Own name" });
    expect(languageName("qac", "qaa")).toBe("Own name");
  });
});

describe("languageOptions", () => {
  it("sorts by the visible name, not by the tag or the given order", () => {
    expect(languageOptions(["tr", "en", "de", "ru"], "en")).toEqual([
      { locale: "en", label: "English" },
      { locale: "de", label: "German" },
      { locale: "ru", label: "Russian" },
      { locale: "tr", label: "Turkish" },
    ]);
    // The same locales in another UI language: other names, another order.
    expect(languageOptions(["tr", "en", "de", "ru"], "de").map((option) => option.label)).toEqual([
      "Deutsch",
      "Englisch",
      "Russisch",
      "Türkisch",
    ]);
  });

  it("sorts the way the UI language sorts", () => {
    // Czech sorts "ch" as one letter after "h", so Chorvatština (Croatian) follows Hindština (Hindi).
    const names = languageOptions(["hr", "hi", "cs", "en"], "cs").map((option) => option.label);
    expect(names).toEqual(["Angličtina", "Čeština", "Hindština", "Chorvatština"]);
    expect([...names].sort((a, b) => a.localeCompare(b, "en"))).toEqual(["Angličtina", "Čeština", "Chorvatština", "Hindština"]);
  });
});

describe("registerLocaleAliases", () => {
  it("names an app's own tag through its alias, as a language and as the UI language", () => {
    registerLocaleAliases({ zz: "de" });

    expect(languageName("zz", "en")).toBe("German");
    expect(languageName("zz", "fr")).toBe("Allemand");
    // As the UI language it reads Intl's German data.
    expect(languageName("zz", "zz")).toBe("Deutsch");
    expect(languageName("en", "zz")).toBe("Englisch");
    expect(languageOptions(["en", "zz"], "en").map((option) => option.label)).toEqual(["English", "German"]);
  });
});

describe("edge cases", () => {
  it("a tag with no name anywhere is shown as given, not capitalized", () => {
    expect(languageName("qtx", "en")).toBe("qtx");
  });

  it("an underscore or private UI tag still sorts the list instead of throwing", () => {
    expect(() => languageOptions(["de", "en", "fr"], "pt_BR")).not.toThrow();
    expect(() => languageOptions(["de", "en", "fr"], "x-zz")).not.toThrow();
    expect(languageOptions(["fr", "de"], "x-zz").map((option) => option.locale)).toHaveLength(2);
  });
});
