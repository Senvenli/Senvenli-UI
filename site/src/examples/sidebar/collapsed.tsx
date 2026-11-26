import { Icon, Text } from "@senvenli/react/display";
import { Sidebar, SidebarAccount } from "@senvenli/react/navigation";

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
        footer={
          <SidebarAccount
            name="Sofia Marin"
            description="sofia@example.com"
            avatarSrc="/avatars/05.webp"
            items={[
              { id: "profile", label: "Profile", icon: "user" },
              { id: "settings", label: "Settings", icon: "settings" },
              { id: "sign-out", label: "Sign out", icon: "log-out", tone: "danger" },
            ]}
          />
        }
      />
      <div className="min-w-0 flex-1 p-ds-300">
        <Text tone="subtle">Shown from 1024px up. Pass storageKey to remember the choice between visits.</Text>
      </div>
    </div>
  );
}
