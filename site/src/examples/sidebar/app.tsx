import { Button } from "@senvenli/react/action";
import { Avatar, Icon, Text } from "@senvenli/react/display";
import { Inline } from "@senvenli/react/layout";
import { Sidebar } from "@senvenli/react/navigation";
import { useState } from "react";

export default function Example() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  return (
    // The Sidebar is as tall as the viewport unless its parent has a height: this frame gives it one.
    <div className="flex h-112 overflow-hidden rounded-ds-large border border-ds-border">
      <Sidebar
        brand={
          <>
            <Icon name="hexagon" />
            Acme
          </>
        }
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
          <Inline space="space-100" wrap={false}>
            <Avatar name="Ada Lovelace" size="small" />
            <Text>Ada Lovelace</Text>
          </Inline>
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
