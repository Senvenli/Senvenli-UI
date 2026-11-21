import { Button } from "@senvenli/react/action";
import { Navbar } from "@senvenli/react/navigation";

export default function Example() {
  return (
    <div className="overflow-hidden rounded-ds-large border border-ds-border">
      <Navbar
        isCompact
        brand="Acme"
        brandHref="#"
        brandLabel="Acme home"
        links={[
          { key: "features", label: "Features", href: "#" },
          { key: "pricing", label: "Pricing", href: "#" },
        ]}
        languages={{
          current: "en",
          items: [
            { code: "en", label: "English", href: "#" },
            { code: "de", label: "Deutsch", href: "#" },
            { code: "fr", label: "Français", href: "#" },
          ],
        }}
        endActions={
          <Button variant="primary" size="compact">
            Start free trial
          </Button>
        }
      />
    </div>
  );
}
