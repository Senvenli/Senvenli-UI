import { Badge } from "@senvenli/react/display";
import { Stack } from "@senvenli/react/layout";
import { LanguageSwitcher } from "@senvenli/react/navigation";
import { useState } from "react";

const LOCALES = ["en", "de", "fr"] as const;

export default function Example() {
  const [locale, setLocale] = useState<(typeof LOCALES)[number]>("en");
  const mark = (code: string) => <Badge>{code.toUpperCase()}</Badge>;
  return (
    <Stack direction="horizontal" space="space-200">
      <LanguageSwitcher size="small" locales={LOCALES} current={locale} onSelect={setLocale} />
      <LanguageSwitcher size="small" isCollapsed label="Interface language" locales={LOCALES} current={locale} onSelect={setLocale} renderMark={mark} />
    </Stack>
  );
}
