import { data } from "react-router";
import { listDocs, renderDoc } from "../lib/docs.server";
import { DocPage } from "../pages/DocPage";
import type { Route } from "./+types/doc";

export const meta: Route.MetaFunction = ({ loaderData }) => [
  { title: loaderData ? `${loaderData.meta.title} · Senvenli UI` : "Docs · Senvenli UI" },
  ...(loaderData ? [{ name: "description", content: loaderData.meta.description }] : []),
];

/** Build time: the Markdown rendered once; the browser gets HTML and code as loader data. */
export async function loader({ params }: Route.LoaderArgs) {
  // "/docs" has no slug: it is the introduction.
  const doc = await renderDoc(params.slug ?? "introduction");
  if (!doc) throw data(null, { status: 404 });
  return { ...doc, docs: listDocs() };
}

export default function DocRoute({ loaderData }: Route.ComponentProps) {
  return <DocPage {...loaderData} />;
}
