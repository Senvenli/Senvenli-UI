import { Breadcrumbs } from "@senvenli/react/navigation";

export default function Example() {
  return <Breadcrumbs aria-label="Location" items={[{ label: "Projects", href: "#" }, { label: "Atlas", href: "#" }, { label: "Settings" }]} />;
}
