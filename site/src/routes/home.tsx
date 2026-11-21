import { loadIndex } from "../lib/manifest.server";
import { HomePage } from "../pages/HomePage";
import type { Route } from "./+types/home";

export const meta: Route.MetaFunction = () => [{ title: "Senvenli UI" }];

export async function loader() {
  return { componentCount: (await loadIndex()).length };
}

export default function HomeRoute({ loaderData }: Route.ComponentProps) {
  return <HomePage componentCount={loaderData.componentCount} />;
}
