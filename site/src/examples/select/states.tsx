import { Stack } from "@senvenli/react/layout";
import { Select } from "@senvenli/react/selection";

const CURRENCIES = [
  { id: "usd", label: "US dollar" },
  { id: "eur", label: "Euro" },
  { id: "gbp", label: "Pound sterling" },
];

export default function Example() {
  return (
    <div className="max-w-80">
      <Stack space="space-300">
        <Select label="Invoice currency" isRequired isInvalid errorMessage="Choose the currency this customer pays in." items={CURRENCIES} />
        <Select label="Account currency" description="Set when the account was created." isDisabled defaultSelectedKey="usd" items={CURRENCIES} />
      </Stack>
    </div>
  );
}
