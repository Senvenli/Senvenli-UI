import { Text } from "@senvenli/react/display";
import { InputOTP } from "@senvenli/react/form";
import { Stack } from "@senvenli/react/layout";
import { useState } from "react";

export default function Example() {
  const [code, setCode] = useState<string | null>(null);
  return (
    <Stack space="space-150">
      <InputOTP
        label="Verification code"
        description="We sent a 6-digit code to ada@example.com."
        onChange={() => setCode(null)}
        onComplete={setCode}
      />
      {code && <Text size="body-small" tone="subtle">Checking {code}…</Text>}
    </Stack>
  );
}
