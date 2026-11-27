/**
 * Builds the component manifests: reads each hand-written
 * `src/<family>/<name>.manifest.json`, adds the generated fields (props from
 * the TypeScript source, tokens, strings, quality, source files) and returns
 * the full manifests plus an index. `manifest.test.ts` checks the committed
 * output against this build; `pnpm manifests` rewrites it.
 *
 * Node-only (TypeScript compiler API); never imported by components.
 */
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

import type { ComponentManifest, HandManifest, JsonSchema, ManifestIndexEntry, PropDoc, PropOrigin, Quality } from "./types";

export const PACKAGE_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
export const SRC = path.join(PACKAGE_ROOT, "src");
export const OUT = path.join(PACKAGE_ROOT, "manifests");

/** Words that must never appear in a generic component (the AGENTS.md rule). */
/** Product words and the Turkish words examples were written in (the library is English-only). */
export const PRODUCT_WORDS =
  /\b(rentsen|tenant|vehicle|rental|booking|reservation|pickup|kiralama|rezervasyon\w*|kaydet\w*|vazge\w*|tamam|devam|d[uü]zenle\w*|iptal|ekle|[oö]deme\w*|fatura\w*|ara[cç]\w*|[sş]ube\w*|m[uü][sş]teri\w*)\b/i;

const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? walk(full) : [full];
  });

export function handManifestFiles(): string[] {
  return walk(SRC)
    .filter((f) => f.endsWith(".manifest.json"))
    .sort();
}

export function readHandManifest(file: string): HandManifest {
  return JSON.parse(fs.readFileSync(file, "utf8")) as HandManifest;
}

// ---------------------------------------------------------------------------
// TypeScript: find each export's declaration and read its props.

function createProgram(): { program: ts.Program; checker: ts.TypeChecker } {
  const files = walk(SRC).filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f) && !f.includes(`${path.sep}manifest${path.sep}`));
  const program = ts.createProgram(files, {
    strict: true,
    jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    target: ts.ScriptTarget.ES2022,
    skipLibCheck: true,
    noEmit: true,
  });
  return { program, checker: program.getTypeChecker() };
}

type ComponentDecl = { file: string; params: ts.NodeArray<ts.ParameterDeclaration>; node: ts.Node };

/**
 * The module the family's index exports `name` from. An internal module may export the same name (the single-mode
 * `Select` behind the public `Select` with `selectionMode`), so the index decides which one is the component.
 */
function publicModule(familyDir: string, name: string): string | undefined {
  const index = path.join(familyDir, "index.ts");
  if (!fs.existsSync(index)) return undefined;
  for (const m of fs.readFileSync(index, "utf8").matchAll(/export\s*\{([^}]*)\}\s*from\s*["']\.\/([\w-]+)["']/g)) {
    const names = m[1]!.split(",").map((part) => part.trim().split(/\s+as\s+/).pop()!.replace(/^type\s+/, ""));
    if (!names.includes(name)) continue;
    return [".tsx", ".ts"].map((ext) => path.join(familyDir, m[2]! + ext)).find((f) => fs.existsSync(f));
  }
  return undefined;
}

function findDeclaration(program: ts.Program, familyDir: string, name: string): ComponentDecl {
  const preferred = publicModule(familyDir, name);
  const files = program.getSourceFiles().filter((sf) => sf.fileName.startsWith(familyDir + path.sep));
  // The index's module first, then the rest of the family as before.
  files.sort((a, b) => Number(path.resolve(b.fileName) === preferred) - Number(path.resolve(a.fileName) === preferred));
  for (const sf of files) {
    let found: ComponentDecl | null = null;
    const isExported = (n: ts.Node) =>
      ts.canHaveModifiers(n) && (ts.getModifiers(n) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    sf.forEachChild((node) => {
      if (found) return;
      if (ts.isFunctionDeclaration(node) && node.name?.text === name && isExported(node)) {
        found = { file: sf.fileName, params: node.parameters, node };
      } else if (ts.isVariableStatement(node) && isExported(node)) {
        for (const d of node.declarationList.declarations) {
          if (!ts.isIdentifier(d.name) || d.name.text !== name || !d.initializer) continue;
          let init: ts.Expression = d.initializer;
          // React.forwardRef(fn), memo(fn)
          while (ts.isCallExpression(init) && init.arguments[0]) init = init.arguments[0];
          if (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) found = { file: sf.fileName, params: init.parameters, node: d };
        }
      }
    });
    if (found) return found;
  }
  throw new Error(`No exported component "${name}" in ${path.relative(PACKAGE_ROOT, familyDir)}`);
}

function defaultsOf(param: ts.ParameterDeclaration | undefined): Map<string, string> {
  const map = new Map<string, string>();
  if (!param || !ts.isObjectBindingPattern(param.name)) return map;
  for (const el of param.name.elements) {
    if (!el.initializer) continue;
    const key = el.propertyName ? el.propertyName.getText() : el.name.getText();
    map.set(key.replace(/^["']|["']$/g, ""), el.initializer.getText());
  }
  return map;
}

const isNever = (t: ts.Type) => (t.flags & ts.TypeFlags.Never) !== 0;
const MAX_ENUM = 100;
const MAX_TYPE_TEXT = 80;

/** A readable type: the checker's text, or the source annotation when the checker's is an expansion (ReactNode). */
/** A type as written, on one line: source formatting (a union broken over lines, a leading "|") is not meaning. */
const oneLine = (text: string) => text.replace(/\s+/g, " ").replace(/^\|\s*/, "").trim();

function typeText(checker: ts.TypeChecker, t: ts.Type, sym: ts.Symbol): string {
  const text = checker.typeToString(t, undefined, ts.TypeFormatFlags.NoTruncation);
  if (text.length <= MAX_TYPE_TEXT) return text;
  // A long type (every Lucide name behind `IconName`) is shown as written in the source, from whichever of the
  // symbol's declarations names it: a prop of a union of props has a declaration per arm, not one valueDeclaration.
  for (const decl of [sym.valueDeclaration, ...(sym.declarations ?? [])]) {
    if (decl && (ts.isPropertySignature(decl) || ts.isPropertyDeclaration(decl)) && decl.type) return oneLine(decl.type.getText());
  }
  // No written type to show: say what kind of value it is rather than print thousands of literals.
  if (t.isUnion() && t.types.every((member) => member.flags & ts.TypeFlags.StringLiteral)) return `string (one of ${t.types.length} names)`;
  return checker.typeToString(t);
}

const declaredAsNode = (sym: ts.Symbol) => {
  const decl = sym.valueDeclaration;
  // A render function (`(row: T) => ReactNode`) mentions ReactNode too, but is not a node: it is left out.
  return Boolean(decl && ts.isPropertySignature(decl) && decl.type && !ts.isFunctionTypeNode(decl.type) && /\bReactNode\b/.test(decl.type.getText()));
};

/**
 * An array of plain-data objects (Select's `items`): each field becomes a property; a React node field takes
 * text. A required field that is not plain data rejects the whole array; an optional one is left out.
 */
function arraySchemaOf(checker: ts.TypeChecker, t: ts.Type, depth: number): JsonSchema | null {
  const element = checker.getTypeArguments(t as ts.TypeReference)[0];
  // A generic row type (Table's `rows: readonly T[]`): in a spec, rows are flat records of plain values,
  // which the columns read by key.
  if (element && depth === 0 && element.flags & ts.TypeFlags.TypeParameter) {
    return { type: "array", items: { type: "object", additionalProperties: { type: ["string", "number", "boolean", "null"] } } };
  }
  if (!element || depth > 2) return null;
  // An array of plain values (a chart's `categories`, a sparkline's numbers).
  if (!(element.flags & ts.TypeFlags.Object)) {
    const items = schemaOf(checker, [element], depth + 1);
    return items ? { type: "array", items } : null;
  }
  const properties: Record<string, JsonSchema> = {};
  const required: string[] = [];
  for (const sym of checker.getPropertiesOfType(element)) {
    const optional = (sym.flags & ts.SymbolFlags.Optional) !== 0;
    const type = checker.getNonNullableType(checker.getTypeOfSymbol(sym));
    const schema = declaredAsNode(sym) ? ({ type: "string" } as JsonSchema) : schemaOf(checker, [type], depth + 1);
    if (!schema) {
      if (!optional) return null;
      continue;
    }
    properties[sym.name] = schema;
    if (!optional) required.push(sym.name);
  }
  return { type: "array", items: { type: "object", additionalProperties: false, properties, ...(required.length ? { required } : {}) } };
}

/** An object whose fields are all optional plain values (a per-breakpoint map); null for anything else. */
function plainObjectSchemaOf(checker: ts.TypeChecker, t: ts.Type, depth: number): JsonSchema | null {
  const properties: Record<string, JsonSchema> = {};
  for (const sym of checker.getPropertiesOfType(t)) {
    if ((sym.flags & ts.SymbolFlags.Optional) === 0) return null;
    const schema = schemaOf(checker, [checker.getNonNullableType(checker.getTypeOfSymbol(sym))], depth + 1);
    if (!schema) return null;
    properties[sym.name] = schema;
  }
  return Object.keys(properties).length ? { type: "object", additionalProperties: false, properties } : null;
}

/** JSON Schema for a prop type, or null when it is not plain data (nodes, functions, objects). */
function schemaOf(checker: ts.TypeChecker, types: ts.Type[], depth = 0): JsonSchema | null {
  // The same array prop from several union arms (ComboBox single | multiple) is one array.
  if (types.length > 0 && types.every((t) => checker.isArrayType(t))) return arraySchemaOf(checker, types[0]!, depth);
  if (types.some((t) => checker.isArrayType(t) || checker.isTupleType(t))) return null;
  // `string & {}` (the "suggest these literals, accept any string" idiom) counts as a plain string.
  const parts = types
    .flatMap((t) => (t.isUnion() ? t.types : [t]))
    .map((t) => (t.isIntersection() && t.types.some((x) => x.flags & ts.TypeFlags.String) ? checker.getStringType() : t));
  if (parts.length === 0) return null;
  // A value or a plain object of the same values (Grid `columns={3}` or `{ base: 1, md: 2 }`): one of the two.
  const isObject = (t: ts.Type) => (t.flags & (ts.TypeFlags.Object | ts.TypeFlags.Intersection)) !== 0;
  const objects = parts.filter(isObject);
  if (objects.length === 1 && objects.length < parts.length && depth === 0) {
    const value = schemaOf(checker, parts.filter((t) => !isObject(t)), depth + 1);
    const object = plainObjectSchemaOf(checker, objects[0]!, depth + 1);
    return value && object ? { anyOf: [value, object] } : null;
  }
  const all = (f: ts.TypeFlags) => parts.every((t) => (t.flags & f) !== 0);
  if (parts.some((t) => t.flags & ts.TypeFlags.String) && all(ts.TypeFlags.String | ts.TypeFlags.StringLiteral)) return { type: "string" };
  if (all(ts.TypeFlags.String)) return { type: "string" };
  if (all(ts.TypeFlags.Number)) return { type: "number" };
  // React Aria's `Key` (string | number): ids a model writes as strings.
  if (all(ts.TypeFlags.String | ts.TypeFlags.Number)) return { type: "string" };
  if (all(ts.TypeFlags.Boolean | ts.TypeFlags.BooleanLiteral)) return { type: "boolean" };
  if (all(ts.TypeFlags.StringLiteral)) {
    const values = [...new Set(parts.map((t) => (t as ts.StringLiteralType).value))];
    // Huge name sets (every Lucide icon) stay a kebab-case string; the renderer checks the name at runtime.
    if (values.length > MAX_ENUM) return { type: "string", pattern: "^[a-z0-9]+(-[a-z0-9]+)*$" };
    return { type: "string", enum: values };
  }
  // Mixed literal unions (`boolean | "bold"`): an enum without a single type.
  if (all(ts.TypeFlags.StringLiteral | ts.TypeFlags.BooleanLiteral | ts.TypeFlags.NumberLiteral)) {
    const literal = (t: ts.Type): string | number | boolean =>
      t.flags & ts.TypeFlags.BooleanLiteral ? checker.typeToString(t) === "true" : (t as ts.LiteralType).value as string | number;
    const values = [...new Set(parts.map(literal))];
    if (values.length <= MAX_ENUM) return { enum: values };
  }
  if (all(ts.TypeFlags.NumberLiteral)) {
    return { type: "number", enum: [...new Set(parts.map((t) => (t as ts.NumberLiteralType).value))] };
  }
  return null;
}

/** React Aria's re-declarations of plain DOM and ARIA attributes: documented by the platform, not by us. */
const DOM_INTERFACES = new Set(["GlobalDOMAttributes", "GlobalDOMEvents", "DOMProps", "AriaLabelingProps", "KeyboardEvents", "SlotProps", "DOMRenderProps"]);

/**
 * Where a prop is declared: in this library (`own`), as React Aria behavior (`aria`: onPress, isDisabled,
 * hover and focus changes), or as a plain DOM or ARIA attribute (`dom`), React Aria's re-declarations included.
 */
function originOf(sym: ts.Symbol): PropOrigin {
  const declaration = sym.declarations?.[0];
  const file = declaration?.getSourceFile().fileName.split(path.sep).join("/") ?? "";
  if (!file.includes("/node_modules/")) return "own";
  if (sym.name.startsWith("aria-")) return "dom";
  const parent = declaration?.parent;
  const owner = parent && (ts.isInterfaceDeclaration(parent) || ts.isTypeAliasDeclaration(parent)) ? parent.name.text : "";
  if (DOM_INTERFACES.has(owner)) return "dom";
  if (/\/(react-aria-components|react-aria|@react-aria|@react-types|@react-stately)\//.test(file)) return "aria";
  return "dom";
}

function propsOf(checker: ts.TypeChecker, decl: ComponentDecl): PropDoc[] {
  const param = decl.params[0];
  if (!param) return [];
  const type = checker.getTypeAtLocation(param);
  const arms = type.isUnion() ? type.types : [type];
  const defaults = defaultsOf(param);
  const byName = new Map<string, { types: ts.Type[]; texts: string[]; required: number; seen: number; sym: ts.Symbol }>();
  for (const arm of arms) {
    for (const sym of checker.getPropertiesOfType(arm)) {
      const t = checker.getNonNullableType(checker.getTypeOfSymbolAtLocation(sym, param));
      if (isNever(t)) continue;
      const entry = byName.get(sym.name) ?? { types: [], texts: [], required: 0, seen: 0, sym };
      entry.types.push(t);
      entry.texts.push(typeText(checker, t, sym));
      entry.seen += 1;
      if (!(sym.flags & ts.SymbolFlags.Optional)) entry.required += 1;
      byName.set(sym.name, entry);
    }
  }
  return [...byName.entries()].map(([name, e]) => {
    const description = ts.displayPartsToString(e.sym.getDocumentationComment(checker)).trim();
    const doc: PropDoc = { name, type: [...new Set(e.texts)].join(" | "), required: e.required === arms.length, origin: originOf(e.sym) };
    const def = defaults.get(name);
    if (def !== undefined) doc.default = def;
    if (description) doc.description = description;
    const schema = schemaOf(checker, e.types);
    if (schema) doc.schema = schema;
    return doc;
  });
}

// ---------------------------------------------------------------------------
// Source scans: tokens and strings.

const SPACING_PREFIX = /^(p[xytrbse]?|m[xytrbse]?|gap(-[xy])?|space-[xy]|inset(-[xy])?|top|bottom|start|end|left|right|translate-[xy]|scroll-[mp][xytrbse]?)$/;
const SIZE_PREFIX = /^(size|h|w|min-h|min-w|max-h|max-w)$/;

/** Tokens used in a source file, normalized to their variable names (ds-space-200, ds-radius-large…). */
export function tokensIn(source: string): string[] {
  const out = new Set<string>();
  for (const word of source.split(/[\s"'`{}()<>,;=]+/)) {
    const cls = (word.split(":").pop() ?? "").replace(/^[!-]+/, "").replace(/\/.*$/, "");
    const at = cls.indexOf("-ds-");
    if (at <= 0 || !/^[a-z-]+$/.test(cls.slice(0, at)) || !/^[a-z0-9-]+$/.test(cls.slice(at + 4))) continue;
    const prefix = cls.slice(0, at);
    // `data-ds-…` / `aria-…` attributes are not utilities.
    if (prefix === "data" || prefix === "aria") continue;
    const token = `ds-${cls.slice(at + 4)}`.replace(/-$/, "");
    if (prefix === "rounded" || prefix.startsWith("rounded-")) out.add(token.replace(/^ds-/, "ds-radius-"));
    else if (prefix === "shadow") out.add(token.replace(/^ds-/, "ds-shadow-"));
    else if (prefix === "ease") out.add(token.replace(/^ds-/, "ds-easing-"));
    else if (prefix === "font") out.add(token.replace(/^ds-/, "font-ds-"));
    else if (SPACING_PREFIX.test(prefix) || SIZE_PREFIX.test(prefix)) {
      const rest = token.slice(3);
      out.add(/^\d/.test(rest) ? `ds-space-${rest}` : `ds-size-${rest}`);
    } else out.add(token);
  }
  for (const m of source.matchAll(/var\(--(ds-[a-z0-9-]+)\)/g)) out.add(m[1]!);
  // A variable the component sets itself (style={{ "--ds-grid-min": … }}) is local, not a theme token.
  for (const m of source.matchAll(/["']--(ds-[a-z0-9-]+)["']\s*:/g)) out.delete(m[1]!);
  return [...out].sort();
}

/**
 * Which `DS_STRINGS` keys each label helper of i18n.ts reads: `pageLabel` reads the `PAGE_N` table, which is
 * `pageN` in `DS_STRINGS`. Read from the source, so a helper's name never has to match its key.
 */
let labelKeyCache: Map<string, string[]> | null = null;
export function labelKeys(): Map<string, string[]> {
  if (labelKeyCache) return labelKeyCache;
  const source = fs.readFileSync(path.join(SRC, "i18n.ts"), "utf8");
  const tableToKey = new Map<string, string>();
  for (const m of source.slice(source.indexOf("export const DS_STRINGS")).matchAll(/(\w+): ([A-Z_0-9]+)[,\n]/g)) tableToKey.set(m[2]!, m[1]!);
  tableToKey.set("STRENGTH", "strength");
  const map = new Map<string, string[]>();
  for (const m of source.matchAll(/export (?:const (\w+) = \([^)]*\)\s*=>|function (\w+)\([^)]*\)[^{]*\{)([\s\S]*?)(?=\nexport |$)/g)) {
    const name = m[1] ?? m[2]!;
    const keys = [...new Set([...m[3]!.matchAll(/\b([A-Z][A-Z_0-9]{2,})\b/g)].map((t) => tableToKey.get(t[1]!)).filter((k): k is string => Boolean(k)))];
    map.set(name, keys.sort());
  }
  labelKeyCache = map;
  return map;
}

/** Component strings a file uses: the `DS_STRINGS` keys behind the label helpers it imports from ../i18n. */
export function stringsIn(source: string): string[] {
  const out = new Set<string>();
  const keys = labelKeys();
  for (const m of source.matchAll(/import\s*\{([^}]+)\}\s*from\s*["']\.\.\/i18n["']/g)) {
    for (const raw of m[1]!.split(",")) {
      const name = raw.trim().split(/\s+as\s+/)[0]!;
      if (!/^[a-z][A-Za-z0-9]*Labels?$/.test(name)) continue;
      for (const key of keys.get(name) ?? [name.replace(/Labels?$/, "")]) out.add(key);
    }
  }
  return [...out].sort();
}

// ---------------------------------------------------------------------------

/** `files` plus every `./module` they import from the same family directory, transitively. */
function localClosure(files: string[], familyDir: string): string[] {
  const seen = new Set<string>();
  const queue = [...files];
  while (queue.length) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    for (const m of fs.readFileSync(file, "utf8").matchAll(/from\s+["']\.\/([a-z0-9-]+)["']/g)) {
      const base = path.join(familyDir, m[1]!);
      const next = [".tsx", ".ts"].map((ext) => base + ext).find((f) => fs.existsSync(f));
      if (next && !next.endsWith(".manifest.json")) queue.push(next);
    }
  }
  return [...seen].sort();
}

/**
 * `files` plus every named module they import, in any family, transitively (family barrels aside): the strings a component shows
 * include those of the parts it borrows (a CopyButton's "Copied", a Tooltip's words), so an app that translates
 * the component finds them all in its manifest.
 */
function fullClosure(files: string[]): string[] {
  const seen = new Set<string>();
  const queue = [...files];
  while (queue.length) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    for (const m of fs.readFileSync(file, "utf8").matchAll(/from\s+["'](\.\.?\/[a-z0-9/-]+)["']/g)) {
      const base = path.resolve(path.dirname(file), m[1]!);
      // A family barrel (`../action/index`) re-exports a whole family; only a named module is a part the component shows.
      if (base.endsWith(`${path.sep}index`)) continue;
      const next = [".tsx", ".ts"].map((ext) => base + ext).find((f) => fs.existsSync(f));
      if (next && !next.endsWith(".manifest.json")) queue.push(next);
    }
  }
  return [...seen].sort();
}

export interface BuildContext {
  /** Token variable names that exist (engine CSS + static theme). */
  knownTokens: Set<string>;
  /** Keys of DS_STRINGS (plus "strength"). */
  knownStrings: Set<string>;
}

export interface BuildResult {
  manifests: ComponentManifest[];
  index: ManifestIndexEntry[];
}

export function buildManifests(ctx: BuildContext): BuildResult {
  const { program, checker } = createProgram();
  const tests = walk(SRC).filter((f) => /\.test\.tsx?$/.test(f));
  const manifests: ComponentManifest[] = [];

  for (const file of handManifestFiles()) {
    const hand = readHandManifest(file);
    const familyDir = path.dirname(file);
    const decls = hand.exports.map((name) => ({ name, decl: findDeclaration(program, familyDir, name) }));
    const sourceFiles = [...new Set(decls.map((d) => d.decl.file))].sort();
    // Scan the declaring files plus the family-local modules they import (./styles, ./touch-target…).
    const sources = localClosure(sourceFiles, familyDir).map((f) => fs.readFileSync(f, "utf8"));

    const props: Record<string, PropDoc[]> = {};
    for (const { name, decl } of decls) props[name] = propsOf(checker, decl);

    const tokens = [...new Set(sources.flatMap(tokensIn))].sort();
    const unknownTokens = tokens.filter((t) => !ctx.knownTokens.has(t));
    if (unknownTokens.length) throw new Error(`${hand.name}: tokens not defined by the theme: ${unknownTokens.join(", ")}`);

    const strings = [...new Set(fullClosure(sourceFiles).map((f) => fs.readFileSync(f, "utf8")).flatMap(stringsIn))].sort();
    const unknownStrings = strings.filter((s) => !ctx.knownStrings.has(s));
    if (unknownStrings.length) throw new Error(`${hand.name}: strings not in DS_STRINGS: ${unknownStrings.join(", ")}`);

    const importsAny = (text: string) => hand.exports.some((e) => new RegExp(`import\\s*\\{[^}]*\\b${e}\\b[^}]*\\}`).test(text));
    const quality: Quality = {
      tests: tests.some((t) => importsAny(fs.readFileSync(t, "utf8"))),
      a11y: false,
      docs: false,
      visual: false,
      dark: false,
      rtl: false,
      mcp: Boolean(hand.description && hand.keywords.length && hand.usage.when.length),
      generic: !PRODUCT_WORDS.test(JSON.stringify(hand)) && !sources.some((s) => PRODUCT_WORDS.test(s)),
    };

    const manifest: ComponentManifest = {
      ...hand,
      $schema: "https://design.senvenli.com/schema/component.full.json",
      source: sourceFiles.map((f) => path.relative(PACKAGE_ROOT, f).split(path.sep).join("/")),
      props,
      tokens,
      strings,
      quality,
    };

    if (hand.genui?.expose) {
      const main = hand.exports[0]!;
      const properties: Record<string, JsonSchema> = {};
      const required: string[] = [];
      for (const ref of hand.genui.props ?? []) {
        const [owner, propName] = ref.includes(".") ? (ref.split(".") as [string, string]) : [main, ref];
        const doc = props[owner]?.find((p) => p.name === propName);
        if (!doc) throw new Error(`${hand.name}: genui prop "${ref}" is not a prop of ${owner}`);
        // A React node prop (label, title) takes plain text from a model: text is a valid node, and
        // nothing else (markup, components) can be injected through it.
        const schema = doc.schema ?? (/\bReactNode\b/.test(doc.type) ? ({ type: "string" } as JsonSchema) : undefined);
        if (!schema) throw new Error(`${hand.name}: genui prop "${ref}" has type ${doc.type}, which has no JSON Schema`);
        properties[propName] = doc.description ? { ...schema, description: doc.description } : schema;
        if (doc.required && owner === main) required.push(propName);
      }
      manifest.genui = {
        ...hand.genui,
        schema: { type: "object", additionalProperties: false, properties, ...(required.length ? { required } : {}) },
      };
    }
    manifests.push(manifest);
  }

  const index: ManifestIndexEntry[] = manifests.map((m) => ({
    name: m.name,
    title: m.title,
    family: m.family,
    status: m.status,
    description: m.description,
    keywords: m.keywords,
    import: m.import,
    exports: m.exports,
    genui: Boolean(m.genui?.expose),
  }));
  return { manifests, index };
}

/** The files the build writes, keyed by path relative to the package root. */
export function renderOutput(result: BuildResult): Map<string, string> {
  const files = new Map<string, string>();
  for (const m of result.manifests) files.set(`manifests/${m.name}.json`, `${JSON.stringify(m, null, 2)}\n`);
  files.set("manifests/index.json", `${JSON.stringify(result.index, null, 2)}\n`);
  return files;
}
