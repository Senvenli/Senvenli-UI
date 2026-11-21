/**
 * Dial codes and national number shapes for phone fields.
 *
 * One free-text box stores "+382 67 123 456", "067123456" and "38267123456" as three spellings of one number.
 * A phone field instead has the reader pick a calling code, groups the digits as they are typed, and stores one
 * E.164 spelling on submit.
 *
 * `libphonenumber-js` is the exhaustive answer, at the cost of a large dependency. This table covers common
 * markets with their grouping, length and trunk prefix; any other country falls back to the shared `DIAL_CODES`
 * list plus digits grouped in threes. The table is the *formatting* table, not the list of countries the picker
 * offers: that comes from `COUNTRIES`. A dialling code belongs in the shared list; a group shape belongs here.
 */

import { COUNTRIES, DIAL_CODES, type Country } from "./countries";
import { intlLocale, regionNames } from "../intl-locale";

export interface PhoneCountry {
  /** ISO 3166-1 alpha-2 — the key `Intl.DisplayNames` resolves. */
  iso: string;
  /** Dial code without the plus. */
  dial: string;
  /**
   * How the national number is spoken aloud, as digit-group lengths.
   * Turkish 5393407624 is "539 340 76 24", so [3, 3, 2, 2].
   */
  groups: number[];
  /** National digit count, inclusive. Some countries genuinely vary. */
  min: number;
  max: number;
  /**
   * The national (trunk) prefix dialled before the national number inside the country ("0" for Montenegro's
   * "068 555 444", "8" for Russia, "1" for the United States), never part of the E.164 number.
   * `null`: the country has none, its numbers are dialled whole (Italy's "06 1234 5678" keeps its 0). Left out:
   * not known, and nothing is ever stripped. Each value is sourced in the table's comment.
   */
  trunkPrefix?: string | null;
  /**
   * The trunk prefix's digits can also begin a valid national number (Russia: "8" is the trunk prefix and 812 is
   * St Petersburg). Then the prefix is stripped only when the rest is a whole number on its own, at the longest
   * length, so a complete national number that starts with those digits is never cut.
   */
  trunkPrefixStartsNumbers?: boolean;
}

/**
 * Sorted by ISO code. Where two countries share a calling code, the one listed first wins when a pasted
 * number is read; no two rows here share one.
 *
 * Trunk prefixes (`trunkPrefix`). Sources, cited per row:
 *   [OB994]  ITU-T, "Dialling procedures (international prefix, national (trunk) prefix and national (significant)
 *            number)", position on 15 December 2011, Annex to ITU Operational Bulletin No. 994 (T-SP-E.164C-2011),
 *            column "National prefix" (notes 2: in France and Switzerland the 0 is dialled on every domestic call).
 *   [ME-NNP] ITU-T national numbering plan communication of 5.XI.2014, EKIP Podgorica: "National prefix: 0".
 *   [AL-NNP] ITU-T national numbering plan communication of 13.II.2017, AKEP: a closed plan, domestic calls use
 *            "the full length number with the prefix 0"; the table lists "0 National prefix".
 *   [RS-PN]  RATEL, Numbering Plan for Telecommunication Networks (16.06.2006): a national call dials "the national
 *            prefix 0", which "is not part of the national number".
 *   [PL-DU]  Rozporządzenie Ministra Administracji i Cyfryzacji z 30.10.2013 w sprawie planu numeracji krajowej
 *            (Dz.U. 2013 poz. 1281), § 4 pkt 2: a national number is dialled "~ KNA", with no prefix; the "0" was
 *            withdrawn from 30.09.2009 (Dz.U. 2009 poz. 1225). [OB994]'s "0" for Poland predates the change.
 *   [RU-142] Rossvyaz plan (Mininformsvyazi order No. 142 of 17.11.2006, as amended): the long-distance prefix "8";
 *            the planned move to "0" was postponed repeatedly and is not recorded here. National numbers also
 *            begin with 8 (ABC 810–880, DEF 800–809, ITU-T communication of 26.X.2016), hence
 *            `trunkPrefixStartsNumbers`.
 *   [XK]     Kosovo, the one row without a regulator source: trunk prefix "0" from
 *            secondary sources only (the Wikipedia "Telephone numbers in Kosovo" infobox; dialling guides). [OB994]
 *            predates +383, and ARKEP's ITU-T communications (15.III.2017, 31.X.2019) state none; revisit if ARKEP
 *            publishes one.
 *   [XK-NNP] ITU-T communication of 15.III.2017, ARKEP: national numbers are 8 to 9 digits; the fixed NDCs 280, 290
 *            and 390 take 9.
 */
export const PHONE_COUNTRIES: readonly PhoneCountry[] = [
  { iso: "AL", dial: "355", groups: [3, 3, 3], min: 9, max: 9, trunkPrefix: "0" }, // [OB994], [AL-NNP]
  { iso: "AT", dial: "43", groups: [3, 3, 4], min: 10, max: 10, trunkPrefix: "0" }, // [OB994]
  { iso: "BA", dial: "387", groups: [2, 3, 3], min: 8, max: 8, trunkPrefix: "0" }, // [OB994]
  { iso: "CH", dial: "41", groups: [2, 3, 2, 2], min: 9, max: 9, trunkPrefix: "0" }, // [OB994] note 2
  { iso: "DE", dial: "49", groups: [3, 4, 4], min: 10, max: 11, trunkPrefix: "0" }, // [OB994]
  { iso: "FR", dial: "33", groups: [1, 2, 2, 2, 2], min: 9, max: 9, trunkPrefix: "0" }, // [OB994] note 2
  { iso: "GB", dial: "44", groups: [4, 3, 3], min: 10, max: 10, trunkPrefix: "0" }, // [OB994]
  { iso: "HR", dial: "385", groups: [2, 3, 4], min: 8, max: 9, trunkPrefix: "0" }, // [OB994]
  { iso: "IT", dial: "39", groups: [3, 3, 4], min: 9, max: 10, trunkPrefix: null }, // [OB994]: none, the 0 is part of the number
  { iso: "ME", dial: "382", groups: [2, 3, 3], min: 8, max: 8, trunkPrefix: "0" }, // [OB994], [ME-NNP]
  { iso: "MK", dial: "389", groups: [2, 3, 3], min: 8, max: 8, trunkPrefix: "0" }, // [OB994]
  { iso: "NL", dial: "31", groups: [1, 4, 4], min: 9, max: 9, trunkPrefix: "0" }, // [OB994]
  { iso: "PL", dial: "48", groups: [3, 3, 3], min: 9, max: 9, trunkPrefix: null }, // [PL-DU]
  { iso: "RS", dial: "381", groups: [2, 3, 4], min: 8, max: 9, trunkPrefix: "0" }, // [OB994], [RS-PN]
  { iso: "RU", dial: "7", groups: [3, 3, 2, 2], min: 10, max: 10, trunkPrefix: "8", trunkPrefixStartsNumbers: true }, // [OB994], [RU-142]
  { iso: "SI", dial: "386", groups: [2, 3, 3], min: 8, max: 8, trunkPrefix: "0" }, // [OB994]
  { iso: "TR", dial: "90", groups: [3, 3, 2, 2], min: 10, max: 10, trunkPrefix: "0" }, // [OB994]
  { iso: "UA", dial: "380", groups: [2, 3, 2, 2], min: 9, max: 9, trunkPrefix: "0" }, // [OB994]
  { iso: "US", dial: "1", groups: [3, 3, 4], min: 10, max: 10, trunkPrefix: "1" }, // [OB994]: NANP numbers never begin with 1
  { iso: "XK", dial: "383", groups: [2, 3, 3], min: 8, max: 9, trunkPrefix: "0" }, // [XK], [XK-NNP]
];

/** The shape used when the country is not in the table. */
const FALLBACK_GROUPS = [3, 3, 3, 3];
const FALLBACK_MIN = 6;
const FALLBACK_MAX = 15;

/**
 * The country a phone field opens on when the app names none: the locale's region ("de-AT" → AT), or the region
 * its language most likely means ("de" → DE, "en" → US); "US" when neither has a calling code.
 */
export function localeCountry(locale: string): string {
  try {
    const region = new Intl.Locale(intlLocale(locale)).maximize().region;
    if (region && DIAL_CODES[region]) return region;
  } catch {
    // An app's private tag Intl cannot read falls through.
  }
  return "US";
}

/**
 * The shape for a country: from the table when it is there, and from the
 * shared dialling codes when it is not.
 *
 * An undefined answer would be silent and expensive — `toE164` writes
 * `+${country?.dial ?? ""}`, so a customer choosing Japan would have stored a
 * number with no country code at all.
 *
 * A synthesised entry carries the real dialling code with the fallback shape.
 * Its trunk prefix is unknown, so nothing is stripped from its
 * numbers.
 */
export function findCountry(iso: string): PhoneCountry | undefined {
  const known = PHONE_COUNTRIES.find((country) => country.iso === iso);
  if (known) return known;

  const dial = DIAL_CODES[iso];
  if (!dial) return undefined;

  return {
    iso,
    dial,
    groups: FALLBACK_GROUPS,
    min: FALLBACK_MIN,
    max: FALLBACK_MAX,
  };
}

const DECIMAL_DIGIT = /\p{Nd}/u;

/**
 * The ASCII digit for any Unicode decimal digit: full-width "５" from a Japanese IME, Arabic-Indic "٥",
 * Extended Arabic-Indic "۵", Devanagari "५"… Unicode keeps every decimal digit set as ten consecutive code
 * points, 0 to 9, so a digit's value is its distance from the start of its run, modulo ten (some sets sit
 * back to back, like the five mathematical ones).
 */
function asciiDigit(digit: string): string {
  const point = digit.codePointAt(0)!;
  if (point <= 0x39) return digit;
  let start = point;
  while (DECIMAL_DIGIT.test(String.fromCodePoint(start - 1))) start -= 1;
  return String((point - start) % 10);
}

/**
 * Digits only, as ASCII. Everything a person might type between them is decoration; a digit typed in another
 * script (a full-width IME, an Arabic or Persian keyboard) is the same digit.
 */
export function digitsOf(value: string): string {
  return value.replace(/\p{Nd}/gu, asciiDigit).replace(/\D/g, "");
}

/** How many digits sit to the left of `caret` in a formatted (or raw) string. */
export function digitCountBefore(value: string, caret: number): number {
  const clamped = Math.max(0, Math.min(caret, value.length));
  return digitsOf(value.slice(0, clamped)).length;
}

/**
 * Character index in `formatted` that sits after `digitCount` digits.
 * Skips a following space so the next keystroke lands in the next group.
 */
export function caretAfterDigits(formatted: string, digitCount: number): number {
  if (digitCount <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (formatted[i] >= "0" && formatted[i] <= "9") {
      seen += 1;
      if (seen === digitCount) {
        let caret = i + 1;
        while (caret < formatted.length && formatted[caret] === " ") caret += 1;
        return caret;
      }
    }
  }
  return formatted.length;
}

/**
 * Grouping spaces are not characters. Backspace/Delete against a space
 * should remove the adjacent digit — otherwise the formatted value is
 * unchanged, React rewrites the input, and the caret jumps to the end
 *.
 */
export function digitIndexForSeparatorKey(
  formatted: string,
  caret: number,
  key: "Backspace" | "Delete",
): number | null {
  const idx = key === "Backspace" ? caret - 1 : caret;
  if (idx < 0 || idx >= formatted.length || formatted[idx] !== " ") return null;
  const before = digitCountBefore(formatted, caret);
  if (key === "Backspace") return before > 0 ? before - 1 : null;
  return before < digitsOf(formatted).length ? before : null;
}

/**
 * Group `digits` the way `country` says the number is spoken.
 *
 * Formats what is there rather than what is missing — a half-typed number gets
 * the spaces it has earned and no trailing separator, so the caret never sits
 * after a space the reader did not type. Digits past the last group stay
 * attached rather than being dropped.
 */
export function formatNational(digits: string, country?: PhoneCountry): string {
  const groups = country?.groups ?? FALLBACK_GROUPS;
  const clean = digitsOf(digits);

  const parts: string[] = [];
  let index = 0;
  for (const size of groups) {
    if (index >= clean.length) break;
    parts.push(clean.slice(index, index + size));
    index += size;
  }
  if (index < clean.length) parts.push(clean.slice(index));

  return parts.join(" ");
}

/** `+90 539 340 76 24` — for display and for anything a human reads. */
export function formatPhone(digits: string, country?: PhoneCountry): string {
  const national = formatNational(digits, country);
  const dial = country?.dial;
  if (!dial) return national;
  return national ? `+${dial} ${national}` : `+${dial}`;
}

/**
 * `+905393407624` — the form sent to the API and used to build a WhatsApp
 * link. Spaces are for reading; a stored number should have one spelling.
 */
export function toE164(digits: string, country?: PhoneCountry): string {
  const clean = digitsOf(digits);
  if (!clean) return "";
  return `+${country?.dial ?? ""}${clean}`;
}

export function isCompleteNational(
  digits: string,
  country?: PhoneCountry,
): boolean {
  const length = digitsOf(digits).length;
  const min = country?.min ?? FALLBACK_MIN;
  const max = country?.max ?? FALLBACK_MAX;
  return length >= min && length <= max;
}

/**
 * Split a stored `+…` number back into a country and its national digits, so
 * returning to a saved draft puts the reader where they left off.
 *
 * Longest dial code first: `+38` is a prefix of `+380`, `+381`, `+382`…
 * Matching short would put a Ukrainian number under Serbia. The curated
 * table is tried first so known shapes win; then every shared dial code so
 * a Japanese number is not handed back as an unrecognised blob.
 */
export function parsePhone(value: string): {
  country?: PhoneCountry;
  national: string;
} {
  const clean = digitsOf(value);
  if (!clean) return { country: undefined, national: "" };

  const known = [...PHONE_COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
  for (const country of known) {
    if (clean.startsWith(country.dial)) {
      return { country, national: clean.slice(country.dial.length) };
    }
  }

  const shared = Object.entries(DIAL_CODES)
    .map(([iso, dial]) => ({ iso, dial }))
    .sort((a, b) => b.dial.length - a.dial.length || a.iso.localeCompare(b.iso));
  for (const { iso, dial } of shared) {
    if (clean.startsWith(dial)) {
      return { country: findCountry(iso), national: clean.slice(dial.length) };
    }
  }

  return { country: undefined, national: clean };
}

/**
 * Localized country name via `Intl.DisplayNames`, e.g. "Germany" / "Deutschland" / "Allemagne".
 * Distinct from `countries.countryName`,
 * which returns the English catalog entry.
 */
export function countryName(iso: string, locale: string): string {
  // A locale the runtime does not know is not a reason to lose the picker.
  return regionNames(locale)(iso) ?? iso;
}

/** The `Intl` locale a phone field names and sorts its countries in. */
export function phoneDisplayLocale(locale: string): string {
  // An app's own tag ("me" for Montenegrin) reaches Intl through `registerLocaleAliases`.
  return intlLocale(locale);
}

/**
 * Every country a phone field offers, named in the reader's language and
 * sorted by that name the way that language sorts ("Tunus" before "Türkiye"
 * in Turkish). Sorting by ISO code instead would show a Turkish reader
 * Ekvator Ginesi, Yunanistan, Guatemala…
 *
 */
export function phoneCountries(locale: string): Country[] {
  const displayLocale = phoneDisplayLocale(locale);
  // One formatter for the whole list: building one per country is what
  // made opening the field slow.
  const names = regionNames(displayLocale);
  let collator: Intl.Collator;
  try {
    collator = new Intl.Collator(displayLocale);
  } catch {
    // A locale the runtime does not know is not a reason to lose the picker.
    collator = new Intl.Collator();
  }
  return COUNTRIES.map((item) => ({
    code: item.code,
    name: names(item.code) ?? item.code,
  })).sort((a, b) => collator.compare(a.name, b.name));
}

/** Complete national number whose E.164 spelling is at most 15 digits. */
export function isSubmittedPhone(value: string): boolean {
  const parsed = parsePhone(value);
  if (!isCompleteNational(parsed.national, parsed.country)) return false;
  return digitsOf(toE164(parsed.national, parsed.country)).length <= 15;
}

/**
 * National digits of a stored E.164 value for the *selected* country.
 * Prefer this over `parsePhone` when the picker already knows the ISO:
 * `parsePhone` has to guess, and shared prefixes (NANP `+1`) can guess wrong.
 */
export function nationalDigits(value: string, country: PhoneCountry): string {
  const clean = digitsOf(value);
  if (!clean) return "";
  if (clean.startsWith(country.dial)) return clean.slice(country.dial.length);
  return clean;
}
