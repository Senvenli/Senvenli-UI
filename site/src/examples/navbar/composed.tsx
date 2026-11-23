import { Button } from "@senvenli/react/action";
import { Badge, Icon, Text } from "@senvenli/react/display";
import { Navbar, NavbarActions, NavbarBrand, NavbarItem } from "@senvenli/react/navigation";

export default function Example() {
  return (
    <div className="overflow-hidden rounded-ds-large border border-ds-border">
      <Navbar brandHref="#" brandLabel="Acme home" currentKey="docs">
        <NavbarBrand>
          <Icon name="hexagon" />
          Acme
        </NavbarBrand>
        <NavbarItem id="features" href="#">
          Features
        </NavbarItem>
        <NavbarItem id="changelog" href="#">
          Changelog
          <Badge variant="subtle" tone="information">
            New
          </Badge>
        </NavbarItem>
        <NavbarItem id="docs" href="#">
          Docs
        </NavbarItem>
        <NavbarActions>
          <Button variant="subtle">Sign in</Button>
          <Button variant="primary">Start free trial</Button>
        </NavbarActions>
      </Navbar>
      <div className="p-ds-300">
        <Text tone="subtle">The page starts here.</Text>
      </div>
    </div>
  );
}
