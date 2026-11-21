import { IsoChip } from "@senvenli/react/display";
import { LanguageSwitcher } from "@senvenli/react/navigation";
import { useState } from "react";

const LOCALES = ["en", "de", "fr", "es"] as const;

export default function Example() {
  const [locale, setLocale] = useState<(typeof LOCALES)[number]>("en");
  return <LanguageSwitcher locales={LOCALES} current={locale} onSelect={setLocale} renderMark={(code) => <IsoChip code={code.toUpperCase()} />} />;
}
