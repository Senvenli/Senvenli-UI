import { LanguageSwitcher } from "@senvenli/react/action";
import { useState } from "react";

const LOCALES = ["en", "de", "fr", "es", "ja"] as const;

export default function Example() {
  // In an app, `onSelect` changes the route or saves the preference.
  const [locale, setLocale] = useState<(typeof LOCALES)[number]>("en");
  return <LanguageSwitcher locales={LOCALES} value={locale} onChange={setLocale} />;
}
