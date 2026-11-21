import { IsoChip } from "@senvenli/react/display";
import { Inline } from "@senvenli/react/layout";
import { LanguageSwitcher } from "@senvenli/react/navigation";
import { useState } from "react";

const LOCALES = ["en", "de", "fr"] as const;

export default function Example() {
  const [locale, setLocale] = useState<(typeof LOCALES)[number]>("en");
  const mark = (code: string) => <IsoChip code={code.toUpperCase()} />;
  return (
    <Inline space="space-200">
      <LanguageSwitcher size="sm" locales={LOCALES} current={locale} onSelect={setLocale} />
      <LanguageSwitcher size="sm" collapsed label="Interface language" locales={LOCALES} current={locale} onSelect={setLocale} renderMark={mark} />
    </Inline>
  );
}
