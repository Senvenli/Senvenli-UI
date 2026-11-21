import { data } from "react-router";
import { DocPage } from "../pages/DocPage";
import type { Route } from "./+types/doc";

const DOCS: Record<string, { title: string; body: string }> = {
  "getting-started": { title: "Getting started", body: "Install the packages, import the theme CSS, wrap the app in DesignSystemProvider." },
};

export const meta: Route.MetaFunction = ({ loaderData }) => [{ title: `${loaderData?.title ?? "Docs"} · Senvenli UI` }];

export async function loader({ params }: Route.LoaderArgs) {
  const doc = DOCS[params.slug];
  if (!doc) throw data(null, { status: 404 });
  return doc;
}

export default function DocRoute({ loaderData }: Route.ComponentProps) {
  return <DocPage title={loaderData.title} body={loaderData.body} />;
}
