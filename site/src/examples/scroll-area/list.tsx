import { ScrollArea, Text } from "@senvenli/react/display";
import { Inline, Stack } from "@senvenli/react/layout";

const ORDERS = Array.from({ length: 16 }, (_, index) => ({ id: 1042 - index, total: 120 + index * 35 }));

export default function Example() {
  return (
    <div className="max-w-sm">
      <ScrollArea aria-label="Recent orders" maxHeight={200}>
        <Stack space="space-150">
          {ORDERS.map((order) => (
            <Inline key={order.id} justify="between">
              <Text>Order #{order.id}</Text>
              <Text tone="subtle" isNumeric>
                ${order.total}.00
              </Text>
            </Inline>
          ))}
        </Stack>
      </ScrollArea>
    </div>
  );
}
