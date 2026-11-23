import { Breadcrumb, Breadcrumbs } from "@senvenli/react/navigation";

export default function Example() {
  return (
    <Breadcrumbs>
      <Breadcrumb href="#" icon="folder">
        Projects
      </Breadcrumb>
      <Breadcrumb href="#" icon="folder">
        Website redesign
      </Breadcrumb>
      <Breadcrumb icon="file-text">Launch plan</Breadcrumb>
    </Breadcrumbs>
  );
}
