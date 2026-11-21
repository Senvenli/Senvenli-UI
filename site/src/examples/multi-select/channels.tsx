import { MultiSelect } from "@senvenli/react/selection";

export default function Example() {
  return (
    <div className="max-w-80">
      <MultiSelect
        label="Notify by"
        placeholder="Add channel"
        defaultSelectedKeys={["email"]}
        items={[
          { id: "email", label: "Email" },
          { id: "sms", label: "Text message" },
          { id: "push", label: "Push notification" },
          { id: "slack", label: "Slack", description: "Posts to #orders" },
        ]}
      />
    </div>
  );
}
