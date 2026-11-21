import { useState } from "react";
import { GridList } from "@senvenli/react/collection";
import { Icon, Text } from "@senvenli/react/display";
import { Stack } from "@senvenli/react/layout";

const DOCUMENTS = [
  { id: "invoice", title: "Invoice 2026-0318", meta: "PDF · 84 KB", icon: "file-text" },
  { id: "report", title: "Q1 sales report", meta: "Spreadsheet · 1.2 MB", icon: "file-spreadsheet" },
  { id: "contract", title: "Supplier contract", meta: "PDF · 310 KB", icon: "file-signature" },
] as const;

export default function Example() {
  const [opened, setOpened] = useState<string | null>(null);
  return (
    <Stack space="space-150">
      <GridList
        aria-label="Documents"
        items={DOCUMENTS}
        onAction={(key) => setOpened(DOCUMENTS.find((document) => document.id === key)?.title ?? null)}
        renderItem={(document) => ({ title: document.title, meta: document.meta, media: <Icon name={document.icon} size="large" /> })}
      />
      <Text size="body-small" tone="subtle">{opened ? `Opened: ${opened}` : "Press a tile, or focus it and press Enter."}</Text>
    </Stack>
  );
}
