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

import type { ComponentManifest, HandManifest, JsonSchema, ManifestIndexEntry, PropDoc, Quality } from "./types";

export const PACKAGE_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
export const SRC = path.join(PACKAGE_ROOT, "src");
export const OUT = path.join(PACKAGE_ROOT, "manifests");

/** Words that must never appear in a generic component (the AGENTS.md rule). */
export const PRODUCT_WORDS = /\b(rentsen|tenant|vehicle|rental|booking|reservation|pickup|kiralama|rezervasyon)\b/i;

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

function findDeclaration(program: ts.Program, familyDir: string, name: string): ComponentDecl {
  for (const sf of program.getSourceFiles()) {
    if (!sf.fileName.startsWith(familyDir + path.sep)) continue;
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
function typeText(checker: ts.TypeChecker, t: ts.Type, sym: ts.Symbol): string {
  const text = checker.typeToString(t, undefined, ts.TypeFormatFlags.NoTruncation);
  const decl = sym.valueDeclaration;
  if (text.length > MAX_TYPE_TEXT && decl && ts.isPropertySignature(decl) && decl.type) return decl.type.getText();
  return text;
}

/** JSON Schema for a prop type, or null when it is not plain data (nodes, functions, objects). */
function schemaOf(checker: ts.TypeChecker, types: ts.Type[]): JsonSchema | null {
  const parts = types.flatMap((t) => (t.isUnion() ? t.types : [t]));
  if (parts.length === 0) return null;
  const all = (f: ts.TypeFlags) => parts.every((t) => (t.flags & f) !== 0);
  if (all(ts.TypeFlags.String)) return { type: "string" };
  if (all(ts.TypeFlags.Number)) return { type: "number" };
  if (all(ts.TypeFlags.Boolean | ts.TypeFlags.BooleanLiteral)) return { type: "boolean" };
  if (all(ts.TypeFlags.StringLiteral)) {
    const values = [...new Set(parts.map((t) => (t as ts.StringLiteralType).value))];
    // Huge name sets (every Lucide icon) stay a kebab-case string; the renderer checks the name at runtime.
    if (values.length > MAX_ENUM) return { type: "string", pattern: "^[a-z0-9]+(-[a-z0-9]+)*$" };
    return { type: "string", enum: values };
  }
  if (all(ts.TypeFlags.NumberLiteral)) {
    return { type: "number", enum: [...new Set(parts.map((t) => (t as ts.NumberLiteralType).value))] };
  }
  void checker;
  return null;
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
    const doc: PropDoc = { name, type: [...new Set(e.texts)].join(" | "), required: e.required === arms.length };
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
  return [...out].sort();
}

/** Component strings a file uses: `fooLabel` / `fooLabels` imported from ../i18n → `foo`. */
export function stringsIn(source: string): string[] {
  const out = new Set<string>();
  for (const m of source.matchAll(/import\s*\{([^}]+)\}\s*from\s*["']\.\.\/i18n["']/g)) {
    for (const raw of m[1]!.split(",")) {
      const name = raw.trim().split(/\s+as\s+/)[0]!;
      const key = name.match(/^([a-z][A-Za-z0-9]*?)Labels?$/)?.[1];
      if (key) out.add(key);
    }
  }
  return [...out].sort();
}

// ---------------------------------------------------------------------------

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
    const sources = sourceFiles.map((f) => fs.readFileSync(f, "utf8"));

    const props: Record<string, PropDoc[]> = {};
    for (const { name, decl } of decls) props[name] = propsOf(checker, decl);

    const tokens = [...new Set(sources.flatMap(tokensIn))].sort();
    const unknownTokens = tokens.filter((t) => !ctx.knownTokens.has(t));
    if (unknownTokens.length) throw new Error(`${hand.name}: tokens not defined by the theme: ${unknownTokens.join(", ")}`);

    const strings = [...new Set(sources.flatMap(stringsIn))].sort();
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
        if (!doc.schema) throw new Error(`${hand.name}: genui prop "${ref}" has type ${doc.type}, which has no JSON Schema`);
        properties[propName] = doc.description ? { ...doc.schema, description: doc.description } : doc.schema;
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
