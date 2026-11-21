import { Text } from "@senvenli/react/display";
import { Dock } from "@senvenli/react/navigation";

export default function Example() {
  return (
    // Demo frame only: `contain-layout` pins the Dock to this box. In an app it sits at the bottom of the viewport.
    <div className="relative mx-auto h-80 max-w-96 overflow-hidden rounded-ds-large border border-ds-border p-ds-200 contain-layout">
      <Text tone="subtle">The Dock shows under 768px.</Text>
      <Dock
        currentKey="orders"
        items={[
          { key: "home", label: "Home", icon: "house", href: "#" },
          { key: "orders", label: "Orders", icon: "shopping-cart", href: "#", badge: { value: 4 } },
          { key: "invoices", label: "Invoices", icon: "receipt", href: "#" },
          { key: "inbox", label: "Inbox", icon: "inbox", href: "#", badge: { value: 2, tone: "danger" } },
          { key: "more", label: "More", icon: "ellipsis", href: "#" },
        ]}
      />
    </div>
  );
}
