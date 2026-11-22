import { Text } from "@senvenli/react/display";
import { Badge } from "@senvenli/react/display";
import { Inline, Stack } from "@senvenli/react/layout";

const INTEGRATIONS = [
  { name: "Accounting", tone: "success", state: "Connected" },
  { name: "Email", tone: "warning", state: "Slow connection" },
  { name: "Calendar", tone: "danger", state: "Offline" },
] as const;

export default function Example() {
  return (
    <Stack space="space-100">
      {INTEGRATIONS.map((integration) => (
        <Inline key={integration.name} space="space-100">
          <Badge variant="dot" tone={integration.tone} aria-label={integration.state} />
          <Text>{integration.name}</Text>
        </Inline>
      ))}
    </Stack>
  );
}
