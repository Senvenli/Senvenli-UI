import type { Component } from "./registry.js";

/** Words that say nothing about which component is wanted. */
const STOP = new Set(
  "a an and the to of for in on at by with from or my our your their his her its it this that these those i we you me us is are be want need needs show shows let lets user users some any component components ui".split(" "),
);

/** Case and accent insensitive words; "DatePicker" also gives "date" and "picker". */
const words = (text: string) =>
  text
    .replace(/(\p{Ll})(\p{Lu})/gu, "$1 $2")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .map(stem);

/** A light English stem, so "sorting", "sorts" and "sorted" all meet "sort". */
function stem(word: string) {
  if (word.length <= 4) return word;
  return word.replace(/(?:ing|ed|es|s)$/, "") || word;
}

/** Words of an identifier both whole ("datepicker") and split ("date", "picker"). */
const identifier = (name: string) => [stem(name.toLowerCase()), ...words(name)];

/**
 * Ranks components for a query by where each word is found: the name, title and exports weigh most, then keywords,
 * then the description, then "when to use it" and guidance (a prefix counts for less). A component that matches more
 * of the query's words ranks above one that matches fewer, so a long, chatty query still finds the right one.
 */
export function searchComponents(components: Component[], query: string, limit = 8): { component: Component; score: number }[] {
  const all = words(query);
  const terms = all.filter((term) => !STOP.has(term));
  if (!terms.length) terms.push(...all);
  if (!terms.length) return [];
  const needed = terms.length <= 2 ? terms.length : Math.ceil(terms.length / 2);
  const fields = (component: Component): [string[], number][] => [
    [[...words(`${component.name} ${component.title}`), stem(component.name.replaceAll("-", "")), ...component.exports.flatMap(identifier)], 10],
    [component.keywords.flatMap(words), 6],
    [words(component.description), 3],
    [words([...(component.manifest.usage?.when ?? []), ...(component.manifest.guidance ?? []).map((item) => item.rule)].join(" ")), 1],
  ];
  const results: { component: Component; score: number }[] = [];
  for (const component of components) {
    let score = 0;
    let matched = 0;
    const lists = fields(component);
    for (const term of terms) {
      let best = 0;
      for (const [list, weight] of lists) {
        if (list.includes(term)) best = Math.max(best, weight);
        else if (term.length > 2 && list.some((word) => word.startsWith(term))) best = Math.max(best, weight * 0.6);
      }
      if (best) matched++;
      score += best;
    }
    // The query is the component's name ("tooltip", "date picker", "DatePicker"): put it first.
    const exact = words(query).join("") === words(component.name).join("") ? 100 : 0;
    if (matched >= needed) results.push({ component, score: score * (matched / terms.length) + exact });
  }
  return results.sort((a, b) => b.score - a.score || a.component.name.localeCompare(b.component.name)).slice(0, limit);
}
