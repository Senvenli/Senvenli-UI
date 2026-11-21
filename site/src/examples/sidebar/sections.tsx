import { Avatar, Icon, Text } from "@senvenli/react/display";
import { Inline } from "@senvenli/react/layout";
import { Sidebar } from "@senvenli/react/navigation";

export default function Example() {
  return (
    <div className="flex h-112 overflow-hidden rounded-ds-large border border-ds-border">
      <Sidebar
        brand={
          <>
            <Icon name="hexagon" />
            Acme
          </>
        }
        brandHref="#"
        currentKey="orders"
        isFooterPinned
        items={[{ id: "home", label: "Home", icon: "house", href: "#" }]}
        sections={[
          {
            id: "sales",
            label: "Sales",
            items: [
              { id: "orders", label: "Orders", icon: "shopping-cart", href: "#", badge: { value: 4 } },
              { id: "customers", label: "Customers", icon: "users", href: "#" },
              { id: "invoices", label: "Invoices", icon: "receipt", href: "#", badge: { value: 2, tone: "danger" } },
            ],
          },
          {
            id: "catalog",
            label: "Catalog",
            items: [
              { id: "products", label: "Products", icon: "package", href: "#" },
              { id: "discounts", label: "Discounts", icon: "tag", href: "#" },
            ],
          },
        ]}
        settings={{
          label: "Settings",
          items: [
            { id: "team", label: "Team", icon: "user-cog", href: "#" },
            { id: "integrations", label: "Integrations", icon: "plug", href: "#" },
          ],
        }}
        footer={
          <Inline space="space-100" wrap={false}>
            <Avatar name="Ada Lovelace" size="small" />
            <Text>Ada Lovelace</Text>
          </Inline>
        }
      />
      <div className="min-w-0 flex-1 p-ds-300">
        <Text tone="subtle">Shown from 1024px up. Under that, the Sidebar is a panel behind the app's menu button.</Text>
      </div>
    </div>
  );
}
