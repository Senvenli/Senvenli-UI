import { Button } from "@senvenli/react/action";
import { LanguageSwitcher, Navbar } from "@senvenli/react/navigation";
import { useState } from "react";

// The language switcher is one of the end actions, before the primary action; on phones it moves into the panel.
export default function Example() {
  const [locale, setLocale] = useState<"en" | "de" | "fr">("en");
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
        endActions={
          <>
            <LanguageSwitcher locales={["en", "de", "fr"]} current={locale} onSelect={setLocale} size="small" />
            <Button variant="primary" size="small">
              Start free trial
            </Button>
          </>
        }
      />
    </div>
  );
}
