import { Badge, Text } from "@senvenli/react/display";
import { Stack } from "@senvenli/react/layout";

const COUNTRIES = [
  { code: "DE", name: "Germany" },
  { code: "US", name: "United States" },
  { code: "JP", name: "Japan" },
];

export default function Example() {
  return (
    <Stack space="space-100">
      {COUNTRIES.map((country) => (
        <Stack direction="horizontal" key={country.code} space="space-100">
          <Badge>{country.code}</Badge>
          <Text>{country.name}</Text>
        </Stack>
      ))}
    </Stack>
  );
}
