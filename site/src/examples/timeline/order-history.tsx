import { Timeline } from "@senvenli/react/display";

// A fixed instant with its offset: the same on the build machine and in every browser.
const NOW = new Date("2026-03-18T14:30:00+01:00");
const ago = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000);

export default function Example() {
  return (
    <Timeline
      timeZone="Europe/Berlin"
      now={NOW}
      items={[
        { id: "4", icon: "circle-check", tone: "success", title: "Order delivered", meta: "Courier", timestamp: ago(3) },
        { id: "3", icon: "truck", tone: "brand", title: "Order shipped", timestamp: ago(240) },
        { id: "2", icon: "pencil", title: "Address changed", meta: "From the mobile app", timestamp: ago(60 * 26) },
        { id: "1", icon: "shopping-cart", title: "Order placed", timestamp: ago(60 * 28) },
      ]}
    />
  );
}
