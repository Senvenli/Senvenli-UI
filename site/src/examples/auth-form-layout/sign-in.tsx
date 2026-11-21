import { Button, Link } from "@senvenli/react/action";
import { Form, PasswordField, TextField } from "@senvenli/react/form";
import { AuthFormLayout } from "@senvenli/react/layout";

export default function Example() {
  return (
    <AuthFormLayout
      className="mx-auto"
      title="Sign in"
      description="Welcome back. Use your work email."
      footerSlot={<Link href="#reset" variant="subtle">Forgot your password?</Link>}
    >
      <Form onSubmit={(event) => event.preventDefault()}>
        <TextField label="Email" name="email" type="email" autoComplete="email" isRequired />
        <PasswordField label="Password" name="password" autoComplete="current-password" isRequired />
        <Button type="submit" variant="primary">Sign in</Button>
      </Form>
    </AuthFormLayout>
  );
}
