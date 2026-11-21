import { digitsOf, type PhoneCountry } from "./phone";

/**
 * A pasted international number's digits, calling code first, or `null` when the paste is not international.
 * PhoneField's rule for a paste.
 *
 * International means it starts with a plus or with two zeros. The plus may be any character that is a plus by
 * compatibility (NFKC): the ASCII "+", a full-width "＋" from a Japanese IME, a small "﹢". The zeros may be in any
 * script, as `digitsOf` reads digits ("00", "００", "٠٠", "۰۰"). NFKC is used only to recognise the plus: the digits
 * are `digitsOf`'s, so what it does not take as a digit ("²", "①", "½") is never one here either.
 */
export function internationalPasteDigits(pasted: string): string | null {
  const text = pasted.trim();
  const [first = "", second = ""] = [...text];
  if (first.normalize("NFKC") === "+") return digitsOf(text);
  if (/^\p{Nd}$/u.test(first) && /^\p{Nd}$/u.test(second) && digitsOf(first + second) === "00") return digitsOf(text).slice(2);
  return null;
}

/**
 * The national number without the country's trunk prefix, when it was typed or pasted with one:
 * Montenegro's "068 555 444" is 68 555 444, Russia's "8 912 345 67 89" is 912 345 67 89. PhoneField applies it
 * to every edit before the length cut.
 *
 * `national` is digits (as `digitsOf` gives them, so a number typed in any script is the same number). Only the
 * prefix the table records is taken off (`PhoneCountry.trunkPrefix`): a country with none (Italy, Poland) or one not
 * known (every country outside the table) keeps every digit. It is taken off only once what is left is long
 * enough to be the country's number, so a half-typed number keeps its prefix until the digit that completes it.
 * Where the prefix's digits can also begin a national number (Russia's 8 and its 8xx codes), the rest has to be a
 * whole number at the country's longest length, so a complete number that starts with them is never cut.
 */
export function stripTrunkPrefix(national: string, country: PhoneCountry | undefined): string {
  const prefix = country?.trunkPrefix;
  if (!country || !prefix || !national.startsWith(prefix)) return national;
  const rest = national.slice(prefix.length);
  const needed = country.trunkPrefixStartsNumbers ? country.max : country.min;
  return rest.length >= needed ? rest : national;
}
