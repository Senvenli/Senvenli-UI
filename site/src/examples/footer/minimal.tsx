import { Footer } from "@senvenli/react/navigation";

export default function Example() {
  return (
    <div className="overflow-hidden rounded-ds-large border border-ds-border">
      <Footer
        brand="Acme"
        brandHref="#"
        brandLabel="Acme home"
        headingLevel={4}
        columns={[
          { title: "Help", links: [{ label: "Documentation", href: "#" }, { label: "Contact support", href: "#" }] },
          { title: "Legal", links: [{ label: "Privacy policy", href: "#" }, { label: "Terms of service", href: "#" }] },
        ]}
        legal="© 2026 Acme, Inc."
      />
    </div>
  );
}
