import type { ExampleData } from "../examples/types";
import type { Manifest, ManifestProp } from "./manifest";

const cell = (text: string) => text.replace(/\|/g, "\\|").replace(/\s*\n\s*/g, " ").trim();

function propRows(props: ManifestProp[]): string[] {
  return [
    "| Prop | Type | Default | Required | Description |",
    "| --- | --- | --- | --- | --- |",
    ...props.map((prop) => `| ${prop.name} | \`${cell(prop.type)}\` | ${prop.default ? `\`${cell(prop.default)}\`` : ""} | ${prop.required ? "yes" : "no"} | ${cell(prop.description ?? "")} |`),
  ];
}

/**
 * The Markdown twin of a component page, for agents: the same manifest and examples as the page, in the same order.
 * Plain DOM and ARIA attributes are only counted, as on the page. No router, no React.
 */
export function manifestToMarkdown(manifest: Manifest, examples: ExampleData[] = [], origin = "https://design.senvenli.com"): string {
  const lines: string[] = [
    `# ${manifest.title}`,
    "",
    manifest.description,
    "",
    `- Family: ${manifest.family}`,
    `- Import: \`import { ${manifest.exports.join(", ")} } from "${manifest.import}";\``,
    `- Page: ${origin}/docs/components/${manifest.name}`,
    `- JSON: ${origin}/docs/components/${manifest.name}.json`,
  ];
  examples.forEach((example, index) => {
    lines.push("", index === 0 ? `## Example: ${example.title}` : `### ${example.title}`, "");
    if (example.description) lines.push(example.description, "");
    lines.push("```tsx", example.code, "```");
    if (index === 0 && examples.length > 1) lines.push("", "## Examples");
  });
  lines.push("", "## Guidelines", "", "### When to use it", "", ...manifest.usage.when.map((line) => `- ${line}`));
  if (manifest.usage.instead?.length) {
    lines.push("", "### Use something else when", "", ...manifest.usage.instead.map((item) => `- [${item.use}](${origin}/docs/components/${item.use}.md): ${item.when}`));
  }
  if (manifest.guidance?.length) {
    lines.push("", "### Do and avoid", "");
    for (const item of manifest.guidance) {
      lines.push(`- ${item.rule}`);
      if (item.do) lines.push(`  - Do: ${item.do}`);
      if (item.avoid) lines.push(`  - Avoid: ${item.avoid}`);
    }
  }
  const a11y = manifest.a11y;
  if (a11y.keyboard?.length || a11y.builtIn?.length || a11y.youProvide?.length) {
    lines.push("", "## Accessibility");
    if (a11y.keyboard?.length) lines.push("", "Keyboard:", "", ...a11y.keyboard.map((row) => `- ${row.keys}: ${row.does}`));
    if (a11y.builtIn?.length) lines.push("", "Built in:", "", ...a11y.builtIn.map((line) => `- ${line}`));
    if (a11y.youProvide?.length) lines.push("", "You provide:", "", ...a11y.youProvide.map((line) => `- ${line}`));
  }
  if (Object.values(manifest.props).some((props) => props.length) || manifest.tokens.length) lines.push("", "## API reference");
  for (const [component, props] of Object.entries(manifest.props)) {
    const own = props.filter((prop) => prop.origin === "own");
    const aria = props.filter((prop) => prop.origin === "aria");
    const dom = props.filter((prop) => prop.origin === "dom").length;
    if (!own.length && !aria.length && !dom) continue;
    lines.push("", `### ${component}`);
    if (own.length) lines.push("", ...propRows(own));
    if (aria.length) lines.push("", "Behavior props from React Aria:", "", ...propRows(aria));
    if (dom) lines.push("", `Also takes ${dom} standard DOM and ARIA attributes (id, aria-label, event handlers…).`);
  }
  if (manifest.tokens.length) lines.push("", "### Tokens it reads", "", manifest.tokens.map((token) => `\`--${token}\``).join(", "));
  if (manifest.related?.length) {
    lines.push("", "## Related", "", ...manifest.related.map((slug) => `- [${slug}](${origin}/docs/components/${slug}.md)`));
  }
  return `${lines.join("\n")}\n`;
}
