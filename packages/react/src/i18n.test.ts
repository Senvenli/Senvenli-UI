import { describe, expect, it } from "vitest";
import { closeLabel, hasDsStrings, optionalLabel, registerDsStrings, strengthLabels, stepOfLabel } from "./i18n";
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
