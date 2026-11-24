import { highlight } from "../lib/highlight.server";
import { orderComponents } from "../lib/manifest";
import { loadIndex, loadManifest } from "../lib/manifest.server";
import { loadExamples } from "../lib/examples.server";
import { manifestToMarkdown } from "../lib/twins";
import { HomePage } from "../pages/HomePage";
import type { Route } from "./+types/home";

export const meta: Route.MetaFunction = () => [
  { title: "Senvenli UI: interfaces people trust" },
  { name: "description", content: "Pick a color and ship: accessible React components on React Aria that look right in light and dark, with readable contrast built in." },
];

export async function loader() {
  const index = orderComponents(await loadIndex());
  const families = [...new Set(index.map((item) => item.family))].map((family) => {
    const names = index.filter((item) => item.family === family).map((item) => item.title);
    return { family, count: names.length, names };
  });
  const button = await loadManifest("button");
  // The first lines of a real Markdown twin: what an agent reads.
  const agentCode = button ? manifestToMarkdown(button, await loadExamples("button")).split("\n").slice(0, 9).join("\n") : "";
  // The same page as JSON: what a tool reads.
  const agentJson = button
    ? JSON.stringify(
        {
          name: button.name,
          import: button.import,
          description: button.description,
          props: (button.props.Button ?? []).slice(0, 3).map((prop) => ({ name: prop.name, type: prop.type })),
        },
        null,
        2,
      )
    : "";
  const [agentHtml, agentJsonHtml] = await Promise.all([highlight(agentCode, "md"), highlight(agentJson, "json")]);
  return { data: { componentCount: index.length, families, agentHtml, agentCode, agentJson, agentJsonHtml } };
}

export default function HomeRoute({ loaderData }: Route.ComponentProps) {
  return <HomePage data={loaderData.data} />;
}
