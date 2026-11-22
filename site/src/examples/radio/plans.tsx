import { Badge, Text } from "@senvenli/react/display";
import { Stack } from "@senvenli/react/layout";
import { Radio, RadioGroup } from "@senvenli/react/selection";

// A card's content is yours: here a name with a "Recommended" Badge, a line of detail and a price.
export default function Example() {
  return (
    <RadioGroup label="Plan" variant="card" defaultValue="team">
      <Radio value="starter" description="For one person.">
        <Stack as="span" space="space-050">
          <span>Starter</span>
          <Text size="body-large" weight="medium" isNumeric>$0</Text>
        </Stack>
      </Radio>
      <Radio value="team" description="Up to 20 people.">
        <Stack as="span" space="space-050">
          <Stack direction="horizontal" as="span" space="space-075" align="center">
            <span>Team</span>
            <Badge tone="brand">Recommended</Badge>
          </Stack>
          <Text size="body-large" weight="medium" isNumeric>$12 / month</Text>
        </Stack>
      </Radio>
      <Radio value="business" description="Audit log and single sign-on.">
        <Stack as="span" space="space-050">
          <span>Business</span>
          <Text size="body-large" weight="medium" isNumeric>$29 / month</Text>
        </Stack>
      </Radio>
    </RadioGroup>
  );
}
