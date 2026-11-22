import { Button } from "@senvenli/react/action";
import { Card, CardBody, CardHeader, IsoChip } from "@senvenli/react/display";
import { Form, PasswordField, TextField } from "@senvenli/react/form";
import { AuthFormLayout, ResetSentCard } from "@senvenli/react/layout";
import { LanguageSwitcher } from "@senvenli/react/navigation";
import { useState } from "react";

const LOCALES = ["en", "de", "fr", "es", "tr", "ar"] as const;
type Locale = (typeof LOCALES)[number];
const REGION: Record<Locale, string> = { en: "GB", de: "DE", fr: "FR", es: "ES", tr: "TR", ar: "SA" };

/** The auth pattern and the language switcher, with and without an app-supplied mark. */
export function AuthPreview() {
  const [locale, setLocale] = useState<Locale>("en");
  return (
    <>
      <Card>
        <CardHeader title="Language switcher" subtitle="Names only by default; a mark is the app's choice" />
        <CardBody>
          <div className="flex flex-wrap items-center gap-ds-200">
            <LanguageSwitcher locales={LOCALES} current={locale} onSelect={setLocale} />
            <LanguageSwitcher locales={LOCALES} current={locale} onSelect={setLocale} renderMark={(l) => <IsoChip code={REGION[l]} />} />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Auth" subtitle="AuthFormLayout, ResetSentCard" />
        <CardBody>
          <div className="flex flex-col gap-ds-300">
            <AuthFormLayout
              title="Sign in"
              description="Welcome back. Use your work email."
              headerSlot={<LanguageSwitcher locales={LOCALES} current={locale} onSelect={setLocale} size="sm" />}
              footerSlot={<span className="text-body-small text-ds-text-subtle">No account yet? Ask your admin for an invite.</span>}
            >
              <Form onSubmit={(event) => event.preventDefault()}>
                <TextField label="Email" type="email" isRequired />
                <PasswordField label="Password" autoComplete="current-password" isRequired />
                <Button type="submit" variant="primary">Sign in</Button>
              </Form>
            </AuthFormLayout>
            <ResetSentCard
              labels={{
                title: "Check your inbox",
                description: "If an account exists for that email, we sent a link to reset the password.",
                resend: "Resend link",
                resendIn: (seconds) => `Resend in ${seconds}s`,
              }}
              onResend={() => new Promise((resolve) => setTimeout(resolve, 800))}
            />
          </div>
        </CardBody>
      </Card>
    </>
  );
}
