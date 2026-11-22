import { Button, Link } from "@senvenli/react/action";
import { Heading, Text } from "@senvenli/react/display";
import { Form, PasswordField, TextField } from "@senvenli/react/form";
import { Split, Stack } from "@senvenli/react/layout";

export default function Example() {
  return (
    // A real sign-in page is the whole screen: `<Split fullHeight …>` and no frame.
    <div className="overflow-hidden rounded-ds-large border border-ds-border">
      <Split ratio="1.05fr 1fr" collapseBelow="48rem" hideOnNarrow="start">
        <Split.Pane as="aside" background="surface-sunken" padding="space-600">
          <Stack space="space-600">
            <Text size="body-large" weight="medium">Acme</Text>
            <Stack space="space-100">
              <Heading level={2} size="heading-xlarge">Every project in one place</Heading>
              <Text tone="subtle">Plan the work, track it and bill it.</Text>
            </Stack>
          </Stack>
        </Split.Pane>
        <Split.Pane as="main" align="center" padding="space-600">
          <Stack space="space-300" as="div">
            <Stack space="space-075">
              <Heading level={1} size="heading-large">Sign in</Heading>
              <Text tone="subtle">Use your work email.</Text>
            </Stack>
            <Form onSubmit={(event) => event.preventDefault()}>
              <TextField label="Email" name="email" type="email" autoComplete="email" isRequired />
              <PasswordField label="Password" name="password" autoComplete="current-password" isRequired />
              <Button type="submit" variant="primary">Sign in</Button>
            </Form>
            <Link href="#reset" variant="subtle">Forgot your password?</Link>
          </Stack>
        </Split.Pane>
      </Split>
    </div>
  );
}
