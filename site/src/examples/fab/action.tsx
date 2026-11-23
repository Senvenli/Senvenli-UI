import { Fab } from "@senvenli/react/action";
import { Text } from "@senvenli/react/display";
import { Stack } from "@senvenli/react/layout";
import { useState } from "react";

export default function Example() {
  const [orders, setOrders] = useState(0);
  return (
    <Stack direction="horizontal" space="space-200">
      {/* In an app, leave `placement` out: the button floats above the page's bottom corner. */}
      <Fab iconBefore="plus" placement="inline" onPress={() => setOrders(orders + 1)}>New order</Fab>
      <Text tone="subtle">Orders started: {orders}</Text>
    </Stack>
  );
}
