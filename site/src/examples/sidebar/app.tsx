import { Button } from "@senvenli/react/action";
import { Icon, Text } from "@senvenli/react/display";
import { Sidebar, SidebarAccount } from "@senvenli/react/navigation";
import { useState } from "react";

export default function Example() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  return (
    // The Sidebar is as tall as the viewport unless its parent has a height: this frame gives it one.
    <div className="flex h-112 overflow-hidden rounded-ds-large border border-ds-border">
      <Sidebar
        logo={<Icon name="hexagon" />}
        brand="Acme"
        brandHref="#"
        currentKey="invoices"
        isMobileOpen={isMenuOpen}
        onMobileOpenChange={setIsMenuOpen}
        items={[
          { id: "home", label: "Home", icon: "house", href: "#" },
          { id: "orders", label: "Orders", icon: "shopping-cart", href: "#", badge: { value: 4 } },
          { id: "customers", label: "Customers", icon: "users", href: "#" },
          {
            id: "billing",
            label: "Billing",
            icon: "credit-card",
            children: [
              { id: "invoices", label: "Invoices", href: "#" },
              { id: "payouts", label: "Payouts", href: "#" },
            ],
          },
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
      <div className="flex min-w-0 flex-1 flex-col items-start gap-ds-150 p-ds-300">
        <div className="lg:hidden">
          <Button variant="subtle" iconOnly iconBefore="menu" aria-label="Open menu" onPress={() => setIsMenuOpen(true)} />
        </div>
        <Text tone="subtle">Invoices</Text>
      </div>
    </div>
  );
}
