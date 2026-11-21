import { createCssVariablesTheme, createHighlighter, type Highlighter } from "shiki";

// Build time only (".server"): code is highlighted once in the prerender and reaches the browser as HTML in the
// loader data. Colors are CSS variables (`--shiki-*`), mapped to the theme's own text tokens in styles.css, so
// code follows light and dark mode and any preset, and no highlighter ships to the browser.
const theme = createCssVariablesTheme({ name: "ds", variablePrefix: "--shiki-", fontStyle: true });

export type CodeLanguage = "tsx" | "ts" | "bash" | "json" | "css" | "md";

let highlighter: Promise<Highlighter> | null = null;
const load = () => (highlighter ??= createHighlighter({ themes: [theme], langs: ["tsx", "ts", "bash", "json", "css", "md"] }));

/** The code as highlighted HTML: a `<pre class="shiki">` of `<span style="color:var(--shiki-…)">` tokens. */
export async function highlight(code: string, lang: CodeLanguage = "tsx"): Promise<string> {
  return (await load()).codeToHtml(code, { lang, theme: "ds" });
}
