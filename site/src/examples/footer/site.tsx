import { Button, Link } from "@senvenli/react/action";
import { Footer } from "@senvenli/react/navigation";

export default function Example() {
  return (
    <div className="overflow-hidden rounded-ds-large border border-ds-border">
      <Footer
        brand="Acme"
        brandHref="#"
        brandLabel="Acme home"
        about="Invoices, orders and customers in one place."
        contact={
          <Link href="#" variant="subtle">
            support@example.com
          </Link>
        }
        columns={[
          { title: "Product", links: [{ label: "Features", href: "#" }, { label: "Pricing", href: "#" }, { label: "Changelog", href: "#" }] },
          { title: "Company", links: [{ label: "About", href: "#" }, { label: "Careers", href: "#" }, { label: "Status page", href: "#", isExternal: true }] },
          { title: "Legal", links: [{ label: "Privacy policy", href: "#" }, { label: "Terms of service", href: "#" }] },
        ]}
        legal="© 2026 Acme, Inc."
        languageSwitch={
          <Button variant="subtle" size="compact" iconBefore="globe">
            English
          </Button>
        }
      />
    </div>
  );
}
