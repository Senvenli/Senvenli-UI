import { Icon, Text } from "@senvenli/react/display";
import { Sidebar } from "@senvenli/react/navigation";

export default function Example() {
  return (
    <div className="flex h-80 overflow-hidden rounded-ds-large border border-ds-border">
      <Sidebar
        logo={<Icon name="hexagon" />}
        brand="Acme"
        brandHref="#"
        currentKey="orders"
        collapsible="none"
        items={[
          { id: "home", label: "Home", icon: "house", href: "#" },
          { id: "orders", label: "Orders", icon: "shopping-cart", href: "#" },
          { id: "customers", label: "Customers", icon: "users", href: "#" },
        ]}
      />
      <div className="min-w-0 flex-1 p-ds-300">
        <Text tone="subtle">Always 240px, with no collapse toggle.</Text>
      </div>
    </div>
  );
}
