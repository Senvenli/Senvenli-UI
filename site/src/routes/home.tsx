import { highlight } from "../lib/highlight.server";
import { orderComponents } from "../lib/manifest";
import { loadIndex, loadManifest } from "../lib/manifest.server";
import { loadExamples } from "../lib/examples.server";
import { manifestToMarkdown } from "../lib/twins";
import { HomePage } from "../pages/HomePage";
import type { Route } from "./+types/home";

export const meta: Route.MetaFunction = () => [
  { title: "Senvenli UI: a design system that themes itself" },
  { name: "description", content: "An open-source React design system on React Aria. Pick up to three colors; every color pair is checked against WCAG AA." },
];

export async function loader() {
  const index = orderComponents(await loadIndex());
  const families = [...new Set(index.map((item) => item.family))].map((family) => ({ family, count: index.filter((item) => item.family === family).length }));
  const button = await loadManifest("button");
  // The first lines of a real Markdown twin: what an agent reads.
  const agentCode = button ? manifestToMarkdown(button, await loadExamples("button")).split("\n").slice(0, 9).join("\n") : "";
  const [installHtml, agentHtml] = await Promise.all([highlight("npm i @senvenli/react @senvenli/tokens", "bash"), highlight(agentCode, "md")]);
  return { data: { componentCount: index.length, families, installHtml, agentHtml, agentCode } };
}

export default function HomeRoute({ loaderData }: Route.ComponentProps) {
  return <HomePage data={loaderData.data} />;
}
