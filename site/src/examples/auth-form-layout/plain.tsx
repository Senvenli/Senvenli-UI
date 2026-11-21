import { Button, Link } from "@senvenli/react/action";
import { Text } from "@senvenli/react/display";
import { Form, PasswordField, TextField } from "@senvenli/react/form";
import { AuthFormLayout } from "@senvenli/react/layout";

export default function Example() {
  return (
    <AuthFormLayout
      className="mx-auto"
      surface="plain"
      title="Create your account"
      description="Start a 14-day trial. No credit card needed."
      footerSlot={<Link href="#sign-in" variant="subtle">Already have an account? Sign in</Link>}
      noticeSlot={
        <Text size="body-small" tone="subtlest" elementType="p">
          By creating an account you agree to the terms of service and the privacy policy.
        </Text>
      }
    >
      <Form onSubmit={(event) => event.preventDefault()}>
        <TextField label="Full name" name="name" autoComplete="name" isRequired />
        <TextField label="Work email" name="email" type="email" autoComplete="email" isRequired />
        <PasswordField
          label="Password"
          name="password"
          autoComplete="new-password"
          description="At least 10 characters."
          showStrength
          isRequired
        />
        <Button type="submit" variant="primary">Create account</Button>
      </Form>
    </AuthFormLayout>
  );
}
