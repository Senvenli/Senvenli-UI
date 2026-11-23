import { Badge } from "@senvenli/react/display";
import { LanguageSwitcher } from "@senvenli/react/action";
import { useState } from "react";

const LOCALES = ["en", "de", "fr", "es"] as const;

export default function Example() {
  const [locale, setLocale] = useState<(typeof LOCALES)[number]>("en");
  return <LanguageSwitcher locales={LOCALES} value={locale} onChange={setLocale} renderMark={(code) => <Badge>{code.toUpperCase()}</Badge>} />;
}
