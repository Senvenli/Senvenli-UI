import { Text } from "@senvenli/react/display";
import { Grid, Stack } from "@senvenli/react/layout";
import { Pressable } from "@senvenli/react/action";
import { useState } from "react";

const PLANS = [
  { id: "starter", name: "Starter", detail: "3 projects, 1 seat" },
  { id: "team", name: "Team", detail: "Unlimited projects, 10 seats" },
];

export default function Example() {
  const [plan, setPlan] = useState("starter");
  return (
    <Grid minColumnWidth={200} space="space-150">
      {PLANS.map((item) => (
        <Pressable
          key={item.id}
          padding="space-200"
          radius="large"
          border
          background={plan === item.id ? "selected" : "surface"}
          aria-pressed={plan === item.id}
          onPress={() => setPlan(item.id)}
        >
          <Stack as="span" space="space-050">
            <Text weight="medium">{item.name}</Text>
            <Text size="body-small" tone="subtle">{item.detail}</Text>
          </Stack>
        </Pressable>
      ))}
    </Grid>
  );
}
