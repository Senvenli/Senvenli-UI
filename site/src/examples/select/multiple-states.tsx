import { Stack } from "@senvenli/react/layout";
import { Select } from "@senvenli/react/selection";
import { useState } from "react";

const ROLES = [
  { id: "admin", label: "Admin" },
  { id: "billing", label: "Billing" },
  { id: "support", label: "Support" },
];

export default function Example() {
  const [roles, setRoles] = useState<(string | number)[]>([]);
  return (
    <div className="max-w-80">
      <Stack space="space-300">
        <Select selectionMode="multiple"
          label="Roles"
          isRequired
          requiredValidation="app"
          isInvalid={roles.length === 0}
          errorMessage="Choose at least one role."
          selectedKeys={roles}
          onSelectionChange={setRoles}
          items={ROLES}
        />
        <Select selectionMode="multiple" label="Inherited roles" isDisabled defaultSelectedKeys={["support"]} items={ROLES} />
      </Stack>
    </div>
  );
}
