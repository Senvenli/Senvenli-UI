import { Text } from "@senvenli/react/display";
import { PhoneField } from "@senvenli/react/form";
import { Stack } from "@senvenli/react/layout";
import { useState } from "react";

export default function Example() {
  const [phone, setPhone] = useState("+442079460958");
  const [country, setCountry] = useState("GB");
  return (
    <Stack space="space-150">
      <PhoneField
        label="Billing phone"
        value={phone}
        country={country}
        suggestedCountries={["US", "CA", "GB"]}
        onChange={(value, nextCountry) => {
          setPhone(value);
          setCountry(nextCountry);
        }}
      />
      <Text size="body-small" tone="subtle">
        Stored as {phone || "nothing yet"} ({country})
      </Text>
    </Stack>
  );
}
