import { Button } from "@senvenli/react/action";
import { Form, FormFooter, Input } from "@senvenli/react/form";
import { useState } from "react";

const TAKEN = "ada@example.com";

export default function Example() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  return (
    <Form
      validationErrors={errors}
      onSubmit={(event) => {
        event.preventDefault();
        // Stands in for the server's answer.
        const email = new FormData(event.currentTarget).get("email");
        setErrors(email === TAKEN ? { email: "That email already has an account. Sign in or use another one." } : {});
      }}
    >
      <Input label="Full name" name="name" autoComplete="name" defaultValue="Ada Lovelace" isRequired />
      <Input label="Email" name="email" type="email" autoComplete="email" defaultValue={TAKEN} isRequired />
      <FormFooter>
        <Button type="submit" variant="primary">Send invite</Button>
      </FormFooter>
    </Form>
  );
}
