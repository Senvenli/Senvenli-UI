import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { PRESET_FORMAT, PRESET_STORAGE_KEY, presetScriptSource } from "../src/lib/theme-head";

/** Runs the head script against a minimal document, as the browser does before the first paint. */
function run({ pathname, search = "", stored }: { pathname: string; search?: string; stored?: { v?: number; code: string; css: string } }) {
  const attributes: Record<string, string> = {};
  const head: { id: string; textContent: string }[] = [];
  const document = {
    documentElement: { setAttribute: (name: string, value: string) => void (attributes[name] = value) },
    createElement: () => ({ id: "", textContent: "" }),
    head: { appendChild: (node: { id: string; textContent: string }) => void head.push(node) },
  };
  const window = { localStorage: { getItem: (key: string) => (stored && key === PRESET_STORAGE_KEY ? JSON.stringify(stored) : null) } };
  runInNewContext(presetScriptSource, { document, window, location: { pathname, search }, URLSearchParams, JSON });
  return { attributes, head };
}

describe("preset head script", () => {
  const stored = { v: PRESET_FORMAT, code: "abc", css: ":root{--ds-surface:red}" };

  it("does nothing for a first visit", () => {
    expect(run({ pathname: "/components/button" })).toEqual({ attributes: {}, head: [] });
  });

  it("replays the stored preset on any page", () => {
    expect(run({ pathname: "/components/button", stored }).head).toEqual([{ id: "theme-vars", textContent: stored.css }]);
  });

  it("replays it on /create when ?p= is the stored code", () => {
    const result = run({ pathname: "/create", search: "?p=abc", stored });
    expect(result.head).toHaveLength(1);
    expect(result.attributes).toEqual({});
  });

  it("holds the preview back on /create when ?p= is a code it has no CSS for", () => {
    expect(run({ pathname: "/create", search: "?p=other", stored })).toEqual({ attributes: { "data-preset-pending": "" }, head: [] });
    expect(run({ pathname: "/create/", search: "?p=other" }).attributes).toEqual({ "data-preset-pending": "" });
  });

  it("ignores a preset stored in another format (token names changed since)", () => {
    expect(run({ pathname: "/components/button", stored: { ...stored, v: PRESET_FORMAT + 1 } }).head).toEqual([]);
    expect(run({ pathname: "/components/button", stored: { code: "abc", css: stored.css } }).head).toEqual([]);
  });

  it("ignores ?p= outside /create", () => {
    expect(run({ pathname: "/components", search: "?p=other", stored }).head).toHaveLength(1);
  });
});
