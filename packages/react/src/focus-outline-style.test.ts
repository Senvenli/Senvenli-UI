import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Two rules about how focus is drawn, checked over the package sources.
//
// 1. Tailwind v4's `outline-hidden` (and `outline-none`) set the outline style to `none`, and a width utility
//    (`outline-2`) keeps the style it finds. A focus outline drawn as `outline-hidden` plus
//    `data-[focus-visible]:outline-2` with no style of its own is therefore never drawn. A variant that gives the
//    outline a width in a file that hides the outline must name the style too (`outline-solid`).
// 2. Focus never draws an outer ring: it is a border or an inset ring color. So no focus variant may push an
//    outline outwards with a positive `outline-offset-*`. An inset offset (`-outline-offset-2`) and
//    `outline-offset-0` stay inside the box and are fine.

// A helper, not an inline `new URL("…", import.meta.url)`: Vite rewrites that literal form into an asset URL.
const here = (file: string) => new URL(file, import.meta.url);
const ROOT = fileURLToPath(here("./"));

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(?:ts|tsx)$/.test(entry.name) && !/\.test\.(?:ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

const tokensOf = (source: string) => source.match(/[^\s"'`]+/g) ?? [];

/** Each variant (`data-[focus-visible]:`, `[&_.x:focus-visible]:`) that sets an outline width but never an outline style. */
function unstyledOutlineWidths(source: string): string[] {
  if (!/(?:^|[\s"'`:])outline-(?:hidden|none)(?![\w-])/.test(source)) return [];
  const widths = new Map<string, string>();
  const styled = new Set<string>();
  for (const token of tokensOf(source)) {
    const match = token.match(/^(.+:)-?outline-(\d+|\[[^\]]+\]|solid|dashed|dotted|double)$/);
    if (!match) continue;
    const [, variant, value] = match;
    if (/^(?:solid|dashed|dotted|double)$/.test(value)) styled.add(variant);
    else if (value !== "0" && !widths.has(variant)) widths.set(variant, token);
  }
  return [...widths].filter(([variant]) => !styled.has(variant)).map(([, token]) => token);
}

/**
 * Each token that gives a focus variant (`focus:`, `focus-visible:`, `focus-within:`, `data-[focus-visible]:`,
 * `[&_.x:focus-visible]:`, `has-[…focus…]:`) a positive outline offset. A leading `-` (inset) and a zero value are
 * allowed; an arbitrary value is an offender unless it is itself negative or zero.
 */
function outerFocusOffsets(source: string): string[] {
  return tokensOf(source).filter((token) => {
    const match = token.match(/^(.+:)!?(-?)outline-offset-(.+?)!?$/);
    if (!match) return false;
    const [, variant, negative, value] = match;
    if (!/focus/.test(variant) || negative) return false;
    const amount = value.replace(/^[[(]|[\])]$/g, "");
    // A custom property (`--offset`) is not a negative length: its value is unknown here, so it counts.
    return !/^-[\d.]/.test(amount) && !/^0(?:px|rem|em)?$/.test(amount);
  });
}

const scan = (find: (source: string) => string[]) =>
  sourceFiles(ROOT).flatMap((path) => find(readFileSync(path, "utf8")).map((token) => `${relative(ROOT, path)}: ${token}`));

describe("focus outline style", () => {
  it("scans the package sources, and not its own fixtures", () => {
    // Non-vacuity: a wrong root would make both scans below pass over nothing.
    const files = sourceFiles(ROOT).map((path) => relative(ROOT, path).split("\\").join("/"));
    expect(files).toEqual(expect.arrayContaining(["action/button.tsx", "form/styles.ts", "selection/select.tsx"]));
    expect(files.filter((file) => /\.test\./.test(file))).toEqual([]);
    // The sources do use the utilities the rules are about, so an empty result means "none break the rule".
    const all = sourceFiles(ROOT).map((path) => readFileSync(path, "utf8")).join("\n");
    expect(all).toMatch(/outline-hidden/);
    expect(all).toMatch(/focus[^\s"'`]*:-outline-offset-/);
  });

  it("names the outline style wherever a hidden outline gets a focus width", () => {
    expect(scan(unstyledOutlineWidths)).toEqual([]);
  });

  it("catches the pattern and accepts the fix", () => {
    expect(unstyledOutlineWidths('"outline-hidden data-[focus-visible]:outline-2 data-[focus-visible]:outline-ds-border-focused"')).toEqual([
      "data-[focus-visible]:outline-2",
    ]);
    expect(unstyledOutlineWidths('"[&_svg]:outline-hidden [&_svg:focus-visible]:outline-2"')).toEqual(["[&_svg:focus-visible]:outline-2"]);
    expect(unstyledOutlineWidths('"outline-hidden data-[focus-visible]:outline-2 data-[focus-visible]:outline-solid"')).toEqual([]);
    // A zero width hides the outline on purpose; without a hidden outline the default style (solid) applies.
    expect(unstyledOutlineWidths('"outline-hidden data-[focus-visible]:outline-0"')).toEqual([]);
    expect(unstyledOutlineWidths('"data-[focus-visible]:outline-2"')).toEqual([]);
  });

  it("never pushes a focus outline outside the box: no positive outline offset under a focus variant", () => {
    expect(scan(outerFocusOffsets)).toEqual([]);
  });

  it("catches an outer focus offset and accepts an inset or zero one", () => {
    const outer = [
      "focus:outline-offset-1",
      "focus-visible:outline-offset-2",
      "focus-within:outline-offset-4",
      "data-[focus-visible]:outline-offset-2",
      "data-[focus-visible]:outline-offset-[3px]",
      "[&_svg:focus-visible]:outline-offset-1",
      "has-[[data-slot=trigger][data-focus-visible]]:outline-offset-2",
      "group-focus-visible:outline-offset-(--offset)",
      "focus-visible:outline-offset-2!",
      "md:focus-visible:outline-offset-px",
    ];
    expect(outerFocusOffsets(`"${outer.join(" ")}"`)).toEqual(outer);

    const inside = [
      "focus-visible:-outline-offset-2",
      "data-[focus-within]:-outline-offset-2",
      "[&_.surface:focus-visible]:-outline-offset-2",
      "focus-visible:outline-offset-0",
      "focus-visible:outline-offset-[0px]",
      "focus-visible:outline-offset-[-2px]",
      // Not a focus variant, or no variant at all: outside this rule.
      "group-data-[open]:outline-offset-2",
      "data-[invalid]:outline-offset-2",
      "outline-offset-2",
      // A focus variant that sets something other than the offset.
      "focus-visible:outline-2",
      "focus-visible:outline-solid",
    ];
    expect(outerFocusOffsets(`"${inside.join(" ")}"`)).toEqual([]);
  });
});
