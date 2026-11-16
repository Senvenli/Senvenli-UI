import fs from "node:fs";
import path from "node:path";
import Ajv from "ajv";
import { createTheme, toCSS } from "@senvenli/tokens";
import { describe, expect, it } from "vitest";

import { DS_STRINGS } from "../i18n";
import { buildManifests, handManifestFiles, PACKAGE_ROOT, readHandManifest, renderOutput, stringsIn, tokensIn } from "./build";

const schema = JSON.parse(fs.readFileSync(path.join(PACKAGE_ROOT, "manifest/component.schema.json"), "utf8"));
const staticTheme = fs.readFileSync(path.join(PACKAGE_ROOT, "styles/theme.css"), "utf8");
const engineCss = toCSS(createTheme(), { tailwind: true });
const knownTokens = new Set([...`${engineCss}\n${staticTheme}`.matchAll(/--([a-z0-9-]+)\s*:/g)].map((m) => m[1]!));
const knownStrings = new Set([...Object.keys(DS_STRINGS), "strength"]);

describe("hand-written manifests", () => {
  const files = handManifestFiles();
  const validate = new Ajv({ allErrors: true }).compile(schema);

  it("exist", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files.map((f) => [path.relative(PACKAGE_ROOT, f), f]))("%s matches the schema", (_, file) => {
    const ok = validate(readHandManifest(file));
    expect(validate.errors ?? [], JSON.stringify(validate.errors, null, 2)).toEqual([]);
    expect(ok).toBe(true);
  });

  it("are named after their file and unique", () => {
    const names = files.map((f) => readHandManifest(f).name);
    expect(files.map((f) => path.basename(f, ".manifest.json"))).toEqual(names);
    expect(new Set(names).size).toBe(names.length);
  });

  it("document every exported component of each family exactly once", () => {
    const documented = files.flatMap((f) => readHandManifest(f).exports);
    expect(new Set(documented).size).toBe(documented.length);
    for (const index of new Set(files.map((f) => path.join(path.dirname(f), "index.ts")))) {
      const source = fs.readFileSync(index, "utf8");
      const exported = [...source.matchAll(/^export \{([^}]+)\} from/gm)].flatMap((m) => m[1]!.split(",").map((s) => s.trim()).filter(Boolean));
      expect(exported.filter((e) => !documented.includes(e)), index).toEqual([]);
    }
  });
});

describe("generated manifests", () => {
  const result = buildManifests({ knownTokens, knownStrings });

  it("read props from the source, merging union arms", () => {
    const card = result.manifests.find((m) => m.name === "card")!;
    const names = card.props.Card!.map((p) => p.name);
    expect(names).toEqual(expect.arrayContaining(["variant", "isCompact", "children", "href", "onPress"]));
    expect(card.props.Card!.find((p) => p.name === "href")!.required).toBe(false);
    const badge = result.manifests.find((m) => m.name === "badge")!;
    const value = badge.props.Badge!.find((p) => p.name === "value")!;
    expect(value.type).toBe("number");
    expect(value.required).toBe(false);
    const lozenge = result.manifests.find((m) => m.name === "lozenge")!;
    expect(lozenge.props.Lozenge!.find((p) => p.name === "tone")).toMatchObject({ default: '"neutral"', required: false });
  });

  it("list only tokens and strings that exist", () => {
    for (const m of result.manifests) {
      expect(m.tokens.filter((t) => !knownTokens.has(t)), m.name).toEqual([]);
      expect(m.strings.filter((s) => !knownStrings.has(s)), m.name).toEqual([]);
    }
    expect(result.manifests.find((m) => m.name === "avatar")!.strings).toEqual(["morePeople", "online"]);
  });

  it("give every exposed genui component a JSON Schema with no styling escape hatches", () => {
    for (const m of result.manifests.filter((x) => x.genui?.expose)) {
      const props = Object.keys(m.genui!.schema!.properties ?? {});
      expect(props.length, m.name).toBeGreaterThan(0);
      expect(props.filter((p) => ["className", "style", "dangerouslySetInnerHTML"].includes(p)), m.name).toEqual([]);
    }
  });

  it("match the full (generated) schema", () => {
    const full = JSON.parse(fs.readFileSync(path.join(PACKAGE_ROOT, "manifest/component.full.schema.json"), "utf8"));
    const validate = new Ajv({ allErrors: true }).compile(full);
    for (const m of result.manifests) {
      validate(m);
      expect(validate.errors ?? [], `${m.name}: ${JSON.stringify(validate.errors)}`).toEqual([]);
    }
  });

  it("name genui children by the slug of an exposed manifest", () => {
    const exposed = new Set(result.manifests.filter((m) => m.genui?.expose).map((m) => m.name));
    for (const m of result.manifests) {
      const children = m.genui?.children;
      if (Array.isArray(children)) expect(children.filter((c) => !exposed.has(c)), m.name).toEqual([]);
    }
  });

  it("export every listed component from the manifest's import path", () => {
    for (const m of result.manifests) {
      const subpath = m.import.replace(/^@senvenli\/react\/?/, "");
      const index = fs.readFileSync(path.join(PACKAGE_ROOT, "src", subpath || ".", "index.ts"), "utf8");
      const exported = [...index.matchAll(/^export \{([^}]+)\} from/gm)].flatMap((x) => x[1]!.split(",").map((s) => s.trim()));
      expect(m.exports.filter((e) => !exported.includes(e)), m.name).toEqual([]);
    }
  });

  it("are generic", () => {
    expect(result.manifests.filter((m) => !m.quality.generic).map((m) => m.name)).toEqual([]);
  });

  it("are committed and up to date (run `pnpm manifests` to refresh)", () => {
    const files = renderOutput(result);
    if (process.env.UPDATE_MANIFESTS) {
      const dir = path.join(PACKAGE_ROOT, "manifests");
      fs.rmSync(dir, { recursive: true, force: true });
      fs.mkdirSync(dir, { recursive: true });
      for (const [rel, text] of files) fs.writeFileSync(path.join(PACKAGE_ROOT, rel), text);
    }
    for (const [rel, text] of files) {
      const full = path.join(PACKAGE_ROOT, rel);
      expect(fs.existsSync(full), `${rel} is missing`).toBe(true);
      expect(fs.readFileSync(full, "utf8"), rel).toBe(text);
    }
    const committed = fs.readdirSync(path.join(PACKAGE_ROOT, "manifests")).map((f) => `manifests/${f}`);
    expect(committed.filter((f) => !files.has(f))).toEqual([]);
  });
});

describe("source scans", () => {
  it("normalize utility classes to token names", () => {
    expect(tokensIn(`"p-ds-200 hover:bg-ds-surface-hovered rounded-ds-large size-ds-icon shadow-ds-raised -mt-ds-050 text-ds-text/50"`)).toEqual([
      "ds-radius-large",
      "ds-shadow-raised",
      "ds-size-icon",
      "ds-space-050",
      "ds-space-200",
      "ds-surface-hovered",
      "ds-text",
    ]);
  });

  it("map label helpers to string keys", () => {
    expect(stringsIn(`import { closeLabel, strengthLabels, cn } from "../i18n";`)).toEqual(["close", "strength"]);
  });
});
