import * as React from "react";

/**
 * Letters that do not fold by Unicode decomposition alone, so "durovic"
 * finds "Đurović" and "istanbul" finds "İstanbul" in every locale.
 */
const FOLD: Record<string, string> = {
  ı: "i", İ: "i", đ: "d", Đ: "d", ł: "l", Ł: "l", ø: "o", Ø: "o", ß: "ss", æ: "ae", Æ: "ae", œ: "oe", Œ: "oe", þ: "th", Þ: "th",
};

/**
 * The text folded for matching. For every UTF-16 unit of the folded text,
 * `start` and `end` give the original character it came from, so a match can
 * be cut back out of the original (emoji, "ß" → "ss" included).
 */
export function foldText(text: string) {
  let folded = "";
  const start: number[] = [];
  const end: number[] = [];
  for (let index = 0; index < text.length; ) {
    const char = String.fromCodePoint(text.codePointAt(index)!);
    const form = FOLD[char] ?? char.normalize("NFD").replace(/\p{M}+/gu, "").toLowerCase();
    for (let unit = 0; unit < form.length; unit++) {
      folded += form[unit];
      start.push(index);
      end.push(index + char.length);
    }
    index += char.length;
  }
  return { folded, start, end };
}

/** Where the query appears in the text (case- and diacritic-insensitive), as original string offsets. */
export function matchRange(text: string, query: string): [number, number] | null {
  const needle = foldText(query.trim()).folded;
  if (!needle) return null;
  const { folded, start, end } = foldText(text);
  const at = folded.indexOf(needle);
  if (at < 0) return null;
  // A match that ends inside an expansion ("stras" in "Straße") takes the whole letter.
  return [start[at], end[at + needle.length - 1]];
}

/** True when the query matches anywhere in any of the texts (label and secondary line, IDs). */
export function matchesQuery(query: string, ...texts: (string | undefined)[]) {
  if (!query.trim()) return true;
  return texts.some((text) => text !== undefined && matchRange(text, query) !== null);
}

/** The text with its matched part in bold (`mark`, no fill), as the design's option rows show it. */
export function Highlight({ text, query }: { text: string; query: string }) {
  const range = matchRange(text, query);
  if (!range) return <>{text}</>;
  const [start, end] = range;
  return (
    <>
      {text.slice(0, start)}
      <mark data-slot="match" className="bg-transparent font-medium text-inherit">
        {text.slice(start, end)}
      </mark>
      {text.slice(end)}
    </>
  );
}
