import { IsoChip, Text } from "@senvenli/react/display";
import { Inline, Stack } from "@senvenli/react/layout";

const COUNTRIES = [
  { code: "DE", name: "Germany" },
  { code: "US", name: "United States" },
  { code: "JP", name: "Japan" },
];

export default function Example() {
  return (
    <Stack space="space-100">
      {COUNTRIES.map((country) => (
        <Inline key={country.code} space="space-100">
          <IsoChip code={country.code} />
          <Text>{country.name}</Text>
        </Inline>
      ))}
    </Stack>
  );
}
