import { TagGroup } from "@senvenli/react/selection";

export default function Example() {
  return (
    <TagGroup
      label="Included in your plan"
      items={[
        { id: "api", label: "API access", icon: "code" },
        { id: "sso", label: "Single sign-on", icon: "key-round" },
        { id: "audit", label: "Audit log", icon: "scroll-text" },
        { id: "support", label: "Priority support" },
      ]}
    />
  );
}
