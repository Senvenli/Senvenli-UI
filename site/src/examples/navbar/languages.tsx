import { Button } from "@senvenli/react/action";
import { Navbar } from "@senvenli/react/navigation";
import { LanguageSwitcher } from "@senvenli/react/action";
import { useState } from "react";

// The language switcher is one of the end actions, before the primary action; on phones it moves into the panel.
export default function Example() {
  const [locale, setLocale] = useState<"en" | "de" | "fr">("en");
  return (
    <div className="overflow-hidden rounded-ds-large border border-ds-border">
      <Navbar
        density="compact"
        brand="Acme"
        brandHref="#"
        brandLabel="Acme home"
        links={[
          { id: "features", label: "Features", href: "#" },
          { id: "pricing", label: "Pricing", href: "#" },
        ]}
        actions={
          <>
            <LanguageSwitcher locales={["en", "de", "fr"]} value={locale} onChange={setLocale} size="small" />
            <Button variant="primary" size="small">
              Start free trial
            </Button>
          </>
        }
      />
    </div>
  );
}
