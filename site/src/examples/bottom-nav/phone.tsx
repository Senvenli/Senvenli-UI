import { Text } from "@senvenli/react/display";
import { BottomNav } from "@senvenli/react/navigation";

export default function Example() {
  return (
    // Demo frame only: `contain-layout` pins the BottomNav to this box. In an app it sits at the bottom of the viewport.
    <div className="relative mx-auto h-80 max-w-96 overflow-hidden rounded-ds-large border border-ds-border p-ds-200 contain-layout">
      <Text tone="subtle">The BottomNav shows under 768px.</Text>
      <BottomNav
        currentKey="orders"
        items={[
          { id: "home", label: "Home", icon: "house", href: "#" },
          { id: "orders", label: "Orders", icon: "shopping-cart", href: "#", badge: { value: 4 } },
          { id: "invoices", label: "Invoices", icon: "receipt", href: "#" },
          { id: "inbox", label: "Inbox", icon: "inbox", href: "#", badge: { value: 2, tone: "danger" } },
          { id: "more", label: "More", icon: "ellipsis", href: "#" },
        ]}
      />
    </div>
  );
}
