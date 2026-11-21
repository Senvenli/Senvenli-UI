// No "use client": plain functions, usable on the server so both render the same names.
import { hasIntlData, intlLocale } from "../intl-locale";

/** App-registered names, by UI language then by language tag. */
const registered = new Map<string, Map<string, string>>();

/**
 * Names for languages the runtime names wrongly or not at all, as the reader of `uiLocale` should see them:
 * Montenegrin, which Intl calls Serbian (`registerLanguageNames("en", { me: "Montenegrin" })`), or every
 * language in a UI language whose display names browsers do not ship (Albanian, Macedonian). `uiLocale` is a
 * language ("sq") or a full tag ("pt-BR"); the full tag wins.
 */
export function registerLanguageNames(uiLocale: string, names: Readonly<Record<string, string>>): void {
  const key = uiLocale.toLowerCase();
  const table = registered.get(key) ?? new Map<string, string>();
  for (const [tag, name] of Object.entries(names)) table.set(tag.toLowerCase(), name);
  registered.set(key, table);
}

function registeredName(locale: string, uiLocale: string): string | undefined {
  const tag = locale.toLowerCase();
  const ui = uiLocale.toLowerCase();
  return registered.get(ui)?.get(tag) ?? registered.get(ui.split(/[-_]/)[0] ?? ui)?.get(tag);
}

/** Uppercase the first code point only, in the UI language ("İngilizce" in Turkish), leaving the rest as given. */
export function capitalizeLanguageName(name: string, uiLocale: string): string {
  const first = [...name][0];
  if (!first) return name;
  try {
    return first.toLocaleUpperCase(intlLocale(uiLocale)) + name.slice(first.length);
  } catch {
    return first.toUpperCase() + name.slice(first.length);
  }
}

function displayName(locale: string, uiLocale: string): string | undefined {
  try {
    // "standard" names a region in brackets ("Portuguese (Brazil)"), not "Brazilian Portuguese".
    return new Intl.DisplayNames([uiLocale], { type: "language", fallback: "none", languageDisplay: "standard" }).of(locale) ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * A language's name in the UI language: the app's registered name, else Intl's (through `registerLocaleAliases`),
 * else the language's own name (its endonym), never the host's language, else the tag itself.
 */
export function languageName(locale: string, uiLocale: string): string {
  const own = registeredName(locale, uiLocale);
  if (own) return own;
  const ui = intlLocale(uiLocale);
  const target = intlLocale(locale);
  // A runtime with no data for the UI language would name languages in the host's language; the endonym is never that.
  const name = hasIntlData(ui) ? displayName(target, ui) : undefined;
  if (name) return capitalizeLanguageName(name, uiLocale);
  // The same rule for the endonym: a language with no data of its own would be named in the host's language.
  const endonym = registeredName(locale, locale) ?? (hasIntlData(target) ? displayName(target, target) : undefined);
  if (endonym) return capitalizeLanguageName(endonym, locale);
  // No name anywhere: the tag as given, not dressed up as a word.
  return locale;
}

/** The locales with their names in the UI language, sorted by that name the way the UI language sorts. */
export function languageOptions<Locale extends string>(locales: readonly Locale[], uiLocale: string): Array<{ locale: Locale; label: string }> {
  let collator: Intl.Collator;
  try {
    collator = new Intl.Collator(intlLocale(uiLocale).replace(/_/g, "-"), { sensitivity: "base" });
  } catch {
    // A tag Intl cannot read ("x-app") still gets a list, in the runtime's default order.
    collator = new Intl.Collator(undefined, { sensitivity: "base" });
  }
  return locales
    .map((locale) => ({ locale, label: languageName(locale, uiLocale) }))
    .sort((a, b) => collator.compare(a.label, b.label) || (a.locale < b.locale ? -1 : a.locale > b.locale ? 1 : 0));
}
