/**
 * Locale helpers for formatting. By default a locale tag goes to `Intl` as-is.
 * An app whose product locales are not valid BCP 47 tags, or need a stand-in
 * with better browser data, registers aliases once at startup:
 *
 *   registerLocaleAliases({ me: "sr-Latn-ME" });
 */

const aliases = new Map<string, string>();
let wordsHook: ((tag: string, text: string) => string) | null = null;

/** Map product locales to the tag handed to `Intl` and React Aria. */
export function registerLocaleAliases(map: Record<string, string>): void {
  for (const [from, to] of Object.entries(map)) aliases.set(from.toLowerCase(), to);
}

/** Post-process text `Intl` wrote (currency names, relative times) for locales that need their own words. */
export function registerLocalWords(hook: ((tag: string, text: string) => string) | null): void {
  wordsHook = hook;
}

/**
 * The app locales a tag stands in for: the reverse of `registerLocaleAliases`. Components see the alias target
 * (React Aria gets it), so string lookup uses this to find the strings registered under the app's own tag.
 */
export function aliasSourcesOf(tag: string): string[] {
  const lower = tag.toLowerCase();
  return [...aliases].filter(([, to]) => to.toLowerCase() === lower).map(([from]) => from);
}

/** The tag to hand `Intl` (and React Aria) for a locale. */
export function intlLocale(locale: string): string {
  const lower = locale.toLowerCase();
  return aliases.get(lower) ?? aliases.get(lower.split(/[-_]/)[0] ?? "") ?? locale;
}

/** The `lang` attribute for content in `locale`. */
export function contentLang(locale: string): string {
  return locale;
}

/** Whether this runtime has formatting data for `tag`. */
export function hasIntlData(tag: string): boolean {
  try {
    return Intl.DateTimeFormat.supportedLocalesOf([tag]).length > 0;
  } catch {
    return false;
  }
}

/** Country names in `tag`; a code the runtime cannot name returns undefined. */
export function regionNames(tag: string): (code: string) => string | undefined {
  let names: Intl.DisplayNames | null = null;
  try {
    names = new Intl.DisplayNames([intlLocale(tag)], { type: "region" });
  } catch {
    names = null;
  }
  return (code) => {
    try {
      return names?.of(code.toUpperCase()) ?? undefined;
    } catch {
      return undefined;
    }
  };
}

/** Whether the app registered a word hook (components skip their rewrite work otherwise). */
export function hasLocalWords(): boolean {
  return wordsHook !== null;
}

/** Text `Intl` wrote in `tag`, after the app's registered word hook (if any). */
export function localWords(tag: string, text: string): string {
  return wordsHook ? wordsHook(tag, text) : text;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

/** Format a date with a cached `Intl.DateTimeFormat`. */
export function formatDateTime(tag: string, options: Intl.DateTimeFormatOptions, date: Date | number): string {
  const resolved = intlLocale(tag);
  const key = `${resolved} ${JSON.stringify(options)}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(resolved, options);
    formatters.set(key, formatter);
  }
  return localWords(tag, formatter.format(date));
}
