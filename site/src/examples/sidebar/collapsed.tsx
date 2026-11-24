import { Avatar, Icon, Text } from "@senvenli/react/display";
import { Sidebar } from "@senvenli/react/navigation";

export default function Example() {
  return (
    <div className="flex h-80 overflow-hidden rounded-ds-large border border-ds-border">
      <Sidebar
        logo={<Icon name="hexagon" />}
        brand="Acme"
        brandHref="#"
        currentKey="orders"
        defaultCollapsed
        items={[
          { id: "home", label: "Home", icon: "house", href: "#" },
          { id: "orders", label: "Orders", icon: "shopping-cart", href: "#", badge: { value: 4 } },
          { id: "customers", label: "Customers", icon: "users", href: "#" },
          { id: "reports", label: "Reports", icon: "chart-column", href: "#" },
        ]}
        avatar={<Avatar name="Sofia Marin" src="/avatars/05.webp" size="small" />}
        footer={<Text>Sofia Marin</Text>}
      />
      <div className="min-w-0 flex-1 p-ds-300">
        <Text tone="subtle">Shown from 1024px up. Pass storageKey to remember the choice between visits.</Text>
      </div>
    </div>
  );
}
