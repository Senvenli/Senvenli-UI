import { Fab } from "@senvenli/react/action";
import { Text } from "@senvenli/react/display";
import { Inline } from "@senvenli/react/layout";
import { useState } from "react";

export default function Example() {
  const [orders, setOrders] = useState(0);
  return (
    <Inline space="space-200">
      {/* In an app, leave `placement` out: the button floats above the page's bottom corner. */}
      <Fab label="New order" icon="plus" placement="inline" onPress={() => setOrders(orders + 1)} />
      <Text tone="subtle">Orders started: {orders}</Text>
    </Inline>
  );
}
