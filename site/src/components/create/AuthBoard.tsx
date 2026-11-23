import { Button } from "@senvenli/react/action";
import { Card, CardBody, CardHeader, Heading, Badge, Text } from "@senvenli/react/display";
import { EmptyState, useCooldownAction } from "@senvenli/react/feedback";
import { Form, Input } from "@senvenli/react/form";
import { Stack } from "@senvenli/react/layout";
import { LanguageSwitcher } from "@senvenli/react/action";
import { useState } from "react";

const LOCALES = ["en", "de", "fr", "es", "tr", "ar"] as const;
type Locale = (typeof LOCALES)[number];
const REGION: Record<Locale, string> = { en: "GB", de: "DE", fr: "FR", es: "ES", tr: "TR", ar: "SA" };

function CheckInbox() {
  const resend = useCooldownAction(() => new Promise((done) => setTimeout(done, 800)), 60, 60);
  return (
    <EmptyState
      size="small"
      icon="mail-check"
      title="Check your inbox"
      description="If an account exists for that email, we sent a link to reset the password."
      primaryAction={
        <Button isDisabled={resend.remaining > 0} isPending={resend.isPending} onPress={() => void resend.run()}>
          {resend.remaining > 0 ? `Resend in ${resend.remaining}s` : "Resend link"}
        </Button>
      }
    />
  );
}

/** A sign-in form and its confirmation, and the language switcher with and without an app-supplied mark. */
export function AuthPreview() {
  const [locale, setLocale] = useState<Locale>("en");
  return (
    <>
      <Card>
        <CardHeader title="Language switcher" subtitle="Names only by default; a mark is the app's choice" />
        <CardBody>
          <div className="flex flex-wrap items-center gap-ds-200">
            <LanguageSwitcher locales={LOCALES} current={locale} onSelect={setLocale} />
            <LanguageSwitcher locales={LOCALES} current={locale} onSelect={setLocale} renderMark={(l) => <Badge>{REGION[l]}</Badge>} />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Sign in" subtitle="A Form, and an EmptyState with a resend that waits" />
        <CardBody>
          <Stack space="space-400">
            <Stack space="space-300">
              <Stack space="space-075">
                <Heading level={3} size="heading-medium">Sign in</Heading>
                <Text tone="subtle">Welcome back. Use your work email.</Text>
              </Stack>
              <Form onSubmit={(event) => event.preventDefault()}>
                <Input label="Email" type="email" isRequired />
                <Input type="password" label="Password" autoComplete="current-password" isRequired />
                <Button type="submit" variant="primary">Sign in</Button>
              </Form>
            </Stack>
            <CheckInbox />
          </Stack>
        </CardBody>
      </Card>
    </>
  );
}
