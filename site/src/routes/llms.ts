import { orderComponents, familyTitle } from "../lib/manifest";
import { loadIndex } from "../lib/manifest.server";

const ORIGIN = "https://design.senvenli.com";

/**
 * /llms.txt (llmstxt.org): what Senvenli UI is and where an agent reads each page as Markdown. Prerendered to a file.
 */
export async function loader() {
  const components = orderComponents(await loadIndex());
  const families = [...new Set(components.map((item) => item.family))];
  const lines = [
    "# Senvenli UI",
    "",
    "> An open-source React design system on React Aria. A theme engine derives a full, WCAG AA-checked theme from zero to three colors. Every component page is also available as Markdown and JSON for agents.",
    "",
    "- Install: `npm i @senvenli/react @senvenli/tokens`",
    `- Schema of the component JSON: ${ORIGIN}/schema/component.full.json`,
    "",
    "## Docs",
    "",
    `- [Getting started](${ORIGIN}/docs/getting-started): install, theme and provider.`,
    "",
  ];
  for (const family of families) {
    lines.push(`## ${familyTitle(family)}`, "");
    for (const item of components.filter((entry) => entry.family === family)) {
      lines.push(`- [${item.title}](${ORIGIN}/components/${item.name}.md): ${item.description}`);
    }
    lines.push("");
  }
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
