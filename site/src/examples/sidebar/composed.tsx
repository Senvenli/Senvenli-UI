import { Avatar, Icon, Text } from "@senvenli/react/display";
import { Stack } from "@senvenli/react/layout";
import { Sidebar, SidebarFooter, SidebarHeader, SidebarItem, SidebarSection, SidebarSubmenu } from "@senvenli/react/navigation";

export default function Example() {
  return (
    <div className="flex h-112 overflow-hidden rounded-ds-large border border-ds-border">
      <Sidebar brandHref="#" currentKey="returns" isFooterPinned>
        <SidebarHeader>
          <Icon name="hexagon" />
          Acme
        </SidebarHeader>
        <SidebarItem id="home" label="Home" icon="house" href="#" />
        <SidebarSection id="sales" label="Sales">
          <SidebarItem id="orders" label="Orders" icon="shopping-cart" href="#" badge={{ value: 4 }} />
          <SidebarSubmenu id="after-sales" label="After sales" icon="package">
            <SidebarItem id="returns" label="Returns" href="#" />
            <SidebarItem id="claims" label="Claims" href="#" />
          </SidebarSubmenu>
          <SidebarItem id="customers" label="Customers" icon="users" href="#" />
        </SidebarSection>
        <SidebarSection id="catalog" label="Catalog">
          <SidebarItem id="products" label="Products" icon="tag" href="#" />
        </SidebarSection>
        <SidebarFooter>
          <Stack direction="horizontal" space="space-100" wrap={false}>
            <Avatar name="Sofia Marin" src="/avatars/05.webp" size="small" />
            <Text>Sofia Marin</Text>
          </Stack>
        </SidebarFooter>
      </Sidebar>
      <div className="min-w-0 flex-1 p-ds-300">
        <Text tone="subtle">Shown from 1024px up. Under that, the Sidebar is a panel behind the app's menu button.</Text>
      </div>
    </div>
  );
}
