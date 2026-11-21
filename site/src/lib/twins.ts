import type { Manifest } from "./manifest";

const cell = (text: string) => text.replace(/\|/g, "\\|").replace(/\n/g, " ");

/** The Markdown twin of a component page: the same manifest, for agents. No router, no React. */
export function manifestToMarkdown(manifest: Manifest, origin = "https://design.senvenli.com"): string {
  const lines: string[] = [
    `# ${manifest.title}`,
    "",
    manifest.description,
    "",
    `- Family: ${manifest.family}`,
    `- Status: ${manifest.status}`,
    `- Import: \`import { ${manifest.exports.join(", ")} } from "${manifest.import}";\``,
    `- JSON: ${origin}/components/${manifest.name}.json`,
    "",
    "## When to use",
    "",
    ...manifest.usage.when.map((line) => `- ${line}`),
  ];
  if (manifest.usage.instead?.length) {
    lines.push("", "## Use something else", "", ...manifest.usage.instead.map((item) => `- [${item.use}](${origin}/components/${item.use}.md): ${item.when}`));
  }
  for (const [component, props] of Object.entries(manifest.props)) {
    lines.push("", `## ${component} props`, "", "| Prop | Type | Required | Description |", "| --- | --- | --- | --- |");
    for (const prop of props) lines.push(`| ${prop.name} | \`${cell(prop.type)}\` | ${prop.required ? "yes" : "no"} | ${cell(prop.description ?? "")} |`);
  }
  if (manifest.a11y.keyboard?.length) {
    lines.push("", "## Keyboard", "", ...manifest.a11y.keyboard.map((row) => `- ${row.keys}: ${row.does}`));
  }
  if (manifest.related?.length) {
    lines.push("", "## Related", "", ...manifest.related.map((slug) => `- [${slug}](${origin}/components/${slug}.md)`));
  }
  return `${lines.join("\n")}\n`;
}
