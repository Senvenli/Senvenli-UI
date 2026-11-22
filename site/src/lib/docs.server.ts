import { Marked, type Tokens } from "marked";
import { highlight, type CodeLanguage } from "./highlight.server";
import { commandVariants } from "./package-managers.server";
import type { CommandVariant } from "./package-managers";
import { loadExamples } from "./examples.server";
import { loadManifest } from "./manifest.server";
import type { ExampleData } from "../examples/types";

// Build time only (".server"): the docs are Markdown files in site/content/docs, rendered to HTML once in the
// prerender. The Markdown twin of a doc is its own source.
const sources = import.meta.glob<string>("../../content/docs/*.md", { query: "?raw", import: "default", eager: true });

export type DocMeta = { slug: string; title: string; description: string; group: string; order: number };
export type DocHeading = { id: string; title: string };
/** The rendered doc as runs: prose HTML, and code blocks the page draws with its own CodeBlock (copy, show all). */
export type DocPart =
  | { kind: "html"; html: string }
  | { kind: "code"; code: string; html: string; lang?: string; variants?: CommandVariant[] }
  /** A live example from a component's page: a fenced block of language `example` holding "slug/id". */
  | { kind: "example"; slug: string; family: string; example: ExampleData };

function parse(raw: string): { meta: Omit<DocMeta, "slug">; body: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  const fields: Record<string, string> = {};
  for (const line of (match?.[1] ?? "").split("\n")) {
    const at = line.indexOf(":");
    if (at > 0) fields[line.slice(0, at).trim()] = line.slice(at + 1).trim();
  }
  return {
    meta: { title: fields.title ?? "", description: fields.description ?? "", group: fields.group ?? "Docs", order: Number(fields.order ?? 99) },
    body: match ? raw.slice(match[0].length) : raw,
  };
}

const slugOf = (path: string) => path.split("/").pop()!.replace(/\.md$/, "");
const anchor = (text: string) => text.toLowerCase().replace(/<[^>]+>/g, "").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");

/** Every doc, in reading order (by `order`, then title). */
export function listDocs(): DocMeta[] {
  return Object.entries(sources)
    .map(([path, raw]) => ({ slug: slugOf(path), ...parse(raw).meta }))
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, "en"));
}

/** The doc's source (its Markdown twin, frontmatter included). */
export function docSource(slug: string): string | null {
  return sources[`../../content/docs/${slug}.md`] ?? null;
}

const LANGS: Record<string, CodeLanguage> = { tsx: "tsx", ts: "ts", bash: "bash", sh: "bash", json: "json", css: "css", md: "md" };

/** The doc rendered: HTML with highlighted code and anchored h2s, and the h2s for "On this page". */
export async function renderDoc(slug: string): Promise<{ meta: DocMeta; parts: DocPart[]; headings: DocHeading[] } | null> {
  const raw = docSource(slug);
  if (raw === null) return null;
  const { meta, body } = parse(raw);
  const headings: DocHeading[] = [];
  const codes: Extract<DocPart, { kind: "code" | "example" }>[] = [];
  const marked = new Marked({
    async: true,
    async walkTokens(token) {
      if (token.type === "code" && (token as Tokens.Code).lang === "example") {
        const [slug = "", id = ""] = (token as Tokens.Code).text.trim().split("/");
        const [examples, manifest] = await Promise.all([loadExamples(slug), loadManifest(slug)]);
        const example = examples.find((item) => item.id === id);
        if (!example || !manifest) throw new Error(`docs/${slug}: no example "${(token as Tokens.Code).text.trim()}"`);
        (token as Tokens.Code & { example?: Extract<DocPart, { kind: "example" }> }).example = { kind: "example", slug, family: manifest.family, example };
      } else if (token.type === "code") {
        const code = token as Tokens.Code;
        const lang = LANGS[code.lang ?? ""] ?? "tsx";
        const extra = code as Tokens.Code & { html?: string; variants?: CommandVariant[] };
        extra.html = await highlight(code.text, lang);
        if (lang === "bash") extra.variants = await commandVariants(code.text);
      }
    },
    renderer: {
      code(token) {
        const live = (token as Tokens.Code & { example?: Extract<DocPart, { kind: "example" }> }).example;
        if (live) {
          codes.push(live);
          return `<!--doc-code:${codes.length - 1}-->`;
        }
        const { html = "", variants } = token as Tokens.Code & { html?: string; variants?: CommandVariant[] };
        codes.push({ kind: "code", code: token.text, html, lang: token.lang || undefined, ...(variants ? { variants } : {}) });
        return `<!--doc-code:${codes.length - 1}-->`;
      },
      heading(token) {
        const text = this.parser.parseInline(token.tokens);
        if (token.depth !== 2) return `<h${token.depth}>${text}</h${token.depth}>`;
        const id = anchor(text);
        headings.push({ id, title: text.replace(/<[^>]+>/g, "") });
        return `<h2 id="${id}">${text}</h2>`;
      },
    },
  });
  const html = await marked.parse(body);
  const parts: DocPart[] = [];
  for (const piece of html.split(/(<!--doc-code:\d+-->)/)) {
    const index = piece.match(/^<!--doc-code:(\d+)-->$/)?.[1];
    if (index !== undefined) parts.push(codes[Number(index)]!);
    else if (piece.trim()) parts.push({ kind: "html", html: piece });
  }
  return { meta: { slug, ...meta }, parts, headings };
}
