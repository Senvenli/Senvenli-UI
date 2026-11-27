import { Icon, Text } from "@senvenli/react/display";
import { Sidebar, SidebarTrigger } from "@senvenli/react/navigation";
import { useState } from "react";

export default function Example() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="flex h-80 overflow-hidden rounded-ds-large border border-ds-border">
      <Sidebar
        id="offcanvas-nav"
        logo={<Icon name="hexagon" />}
        brand="Acme"
        brandHref="#"
        currentKey="orders"
        collapsible="offcanvas"
        togglePlacement="header"
        isCollapsed={collapsed}
        onCollapsedChange={setCollapsed}
        items={[
          { id: "home", label: "Home", icon: "house", href: "#" },
          { id: "orders", label: "Orders", icon: "shopping-cart", href: "#" },
          { id: "customers", label: "Customers", icon: "users", href: "#" },
        ]}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-ds-200 p-ds-300">
        {collapsed && <SidebarTrigger isCollapsed={collapsed} onCollapsedChange={setCollapsed} aria-controls="offcanvas-nav" />}
        <Text tone="subtle">Collapse it from its header; the trigger here brings it back.</Text>
      </div>
    </div>
  );
}
