import { Text, Timeline } from "@senvenli/react/display";

export default function Example() {
  return (
    <Timeline
      items={[
        { id: "account", title: "Create your account", tone: "success", icon: "check", children: <Text tone="subtle">Done in under a minute.</Text> },
        { id: "team", title: "Invite your team", tone: "brand" },
        { id: "data", title: "Import your data" },
        { id: "live", title: "Go live" },
      ]}
    />
  );
}
