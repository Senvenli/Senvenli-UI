import { CreatePage } from "../pages/CreatePage";
import type { Route } from "./+types/create";

export const meta: Route.MetaFunction = () => [{ title: "Create a theme · Senvenli UI" }];

export default function CreateRoute() {
  return <CreatePage />;
}
