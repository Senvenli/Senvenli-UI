import { Button } from "@senvenli/react/action";
import { Banner } from "@senvenli/react/feedback";
import { Form, FormFooter, Input } from "@senvenli/react/form";
import { Stack } from "@senvenli/react/layout";
import { useState } from "react";

export default function Example() {
  const [project, setProject] = useState<string | null>(null);
  return (
    <Stack space="space-300">
      {project && <Banner tone="success" title={`${project} was created`} onDismiss={() => setProject(null)} />}
      <Form
        onSubmit={(event) => {
          event.preventDefault();
          setProject(String(new FormData(event.currentTarget).get("name")));
        }}
      >
        <Input
          label="Project name"
          name="name"
          isRequired
          validate={(value) => (value.trim().length < 3 ? "Use at least 3 characters, so the team can tell projects apart." : null)}
        />
        <Input label="Client email" name="email" type="email" isRequired errorMessage="Enter a valid email: name@example.com" />
        <Input type="number" label="Budget" name="budget" currency="USD" minValue={0} isOptional />
        <FormFooter>
          <Button type="submit" variant="primary">Create project</Button>
        </FormFooter>
      </Form>
    </Stack>
  );
}
