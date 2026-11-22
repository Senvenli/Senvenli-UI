import { Button } from "@senvenli/react/action";
import { Form, Input } from "@senvenli/react/form";
import { Stack } from "@senvenli/react/layout";
import { Dialog, DialogTrigger, toast } from "@senvenli/react/overlay";
import { Select } from "@senvenli/react/selection";
import { useId, useState } from "react";

export default function Example() {
  const [isOpen, setIsOpen] = useState(false);
  const formId = useId();
  return (
    <DialogTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
      <Button iconBefore="user-plus">Invite member</Button>
      <Dialog title="Invite a team member" primaryAction={{ label: "Send invite", form: formId }}>
        <Form
          id={formId}
          onSubmit={(event) => {
            event.preventDefault();
            const email = new FormData(event.currentTarget).get("email");
            setIsOpen(false);
            toast.success("Invite sent", { description: String(email) });
          }}
        >
          <Stack space="space-200">
            <Input label="Email" name="email" type="email" isRequired />
            <Select
              label="Role"
              name="role"
              defaultSelectedKey="member"
              items={[
                { id: "member", label: "Member" },
                { id: "admin", label: "Admin" },
              ]}
            />
          </Stack>
        </Form>
      </Dialog>
    </DialogTrigger>
  );
}
