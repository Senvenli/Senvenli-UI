import { Button, Link } from "@senvenli/react/action";
import { Heading, Text } from "@senvenli/react/display";
import { Form, PasswordField, TextField } from "@senvenli/react/form";
import { AuthFormLayout, AuthLayout, Stack } from "@senvenli/react/layout";

export default function Example() {
  return (
    // A real screen leaves the default full-viewport height; `min-h-130` only fits it to this frame.
    <div className="overflow-hidden rounded-ds-large border border-ds-border">
      <AuthLayout
        className="min-h-130"
        brandClassName="bg-ds-surface-sunken text-ds-text"
        brandLogo={<Text size="body-large" weight="medium">Acme</Text>}
        brandContent={
          <Stack space="space-100">
            <Heading level={2} size="heading-xlarge">Every project in one place</Heading>
            <Text tone="subtle">Plan the work, track it and bill it.</Text>
          </Stack>
        }
        brandFooter={<Text size="body-small" tone="subtlest">Acme, Inc.</Text>}
        topRightSlot={<Link href="#help" variant="subtle">Help</Link>}
      >
        <AuthFormLayout surface="plain" title="Sign in" description="Use your work email.">
          <Form onSubmit={(event) => event.preventDefault()}>
            <TextField label="Email" name="email" type="email" autoComplete="email" isRequired />
            <PasswordField label="Password" name="password" autoComplete="current-password" isRequired />
            <Button type="submit" variant="primary">Sign in</Button>
          </Form>
        </AuthFormLayout>
      </AuthLayout>
    </div>
  );
}
