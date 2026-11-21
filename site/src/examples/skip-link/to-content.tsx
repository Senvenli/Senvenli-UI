import { Button, Link } from "@senvenli/react/action";
import { Text } from "@senvenli/react/display";
import { Inline, Stack } from "@senvenli/react/layout";
import { SkipLink } from "@senvenli/react/navigation";

export default function Example() {
  return (
    // Demo frame only: `contain-layout` keeps the focused link inside this box, and the button gives Tab a
    // place to start. In an app, SkipLink is the first element in <body> and targets the page's <main>.
    <div className="rounded-ds-large border border-ds-border p-ds-300 pt-ds-800 contain-layout">
      <Stack space="space-200">
        <Inline space="space-200">
          <Button>Start here, then press Tab</Button>
          <SkipLink target="#skip-link-example-content" />
          <Link href="#">Orders</Link>
          <Link href="#">Customers</Link>
          <Link href="#">Invoices</Link>
        </Inline>
        <div id="skip-link-example-content">
          <Text tone="subtle">Main content: the skip link moves focus here, past the links above.</Text>
        </div>
      </Stack>
    </div>
  );
}
