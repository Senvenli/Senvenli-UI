import { Button } from "@senvenli/react/action";
import { Text } from "@senvenli/react/display";
import { Navbar } from "@senvenli/react/navigation";

export default function Example() {
  return (
    <div className="overflow-hidden rounded-ds-large border border-ds-border">
      <Navbar
        brand="Acme"
        brandHref="#"
        brandLabel="Acme home"
        currentKey="pricing"
        links={[
          { id: "features", label: "Features", href: "#" },
          { id: "pricing", label: "Pricing", href: "#" },
          { id: "docs", label: "Docs", href: "#" },
        ]}
        actions={
          <>
            <Button variant="subtle">Sign in</Button>
            <Button variant="primary">Start free trial</Button>
          </>
        }
      />
      <div className="p-ds-300">
        <Text tone="subtle">The page starts here.</Text>
      </div>
    </div>
  );
}
