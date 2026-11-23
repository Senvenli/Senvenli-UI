import { Link } from "@senvenli/react/action";
import { Separator, Text } from "@senvenli/react/display";
import { Box, Grid, Stack } from "@senvenli/react/layout";
import { LanguageSwitcher } from "@senvenli/react/action";
import { useState } from "react";

const COLUMNS = [
  { title: "Product", links: ["Features", "Pricing", "Changelog"] },
  { title: "Company", links: ["About", "Careers", "Status"] },
  { title: "Legal", links: ["Privacy policy", "Terms of service"] },
];

// A site footer is a Grid of link columns over a legal row: no component of its own, so every part stays yours.
export default function Example() {
  const [locale, setLocale] = useState<"en" | "de" | "tr">("en");
  return (
    <Box as="footer" padding="space-400" background="surface-sunken" radius="large">
      <Stack space="space-400">
        <Grid minColumnWidth={160} space="space-300">
          <Stack space="space-100">
            <Text weight="medium">Acme</Text>
            <Text size="body-small" tone="subtle">Invoices, orders and customers in one place.</Text>
          </Stack>
          {COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <Stack space="space-100">
                <Text size="body-small" weight="medium" tone="subtle">{column.title}</Text>
                {column.links.map((label) => (
                  <Link key={label} href="#" variant="subtle">{label}</Link>
                ))}
              </Stack>
            </nav>
          ))}
        </Grid>
        <Separator />
        <Stack direction="horizontal" space="space-200" justify="between" align="center">
          <Text size="body-small" tone="subtle">© 2026 Acme, Inc.</Text>
          <LanguageSwitcher locales={["en", "de", "tr"]} value={locale} onChange={setLocale} />
        </Stack>
      </Stack>
    </Box>
  );
}
