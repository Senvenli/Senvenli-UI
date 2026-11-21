import { RadioCard } from "@senvenli/react/selection";

export default function Example() {
  return (
    <RadioCard
      label="Plan"
      defaultValue="team"
      items={[
        { value: "starter", title: "Starter", description: "For one person.", price: "$0" },
        { value: "team", title: "Team", description: "Up to 20 people.", price: "$12 / month", badge: "Recommended" },
        { value: "business", title: "Business", description: "Audit log and single sign-on.", price: "$29 / month" },
      ]}
    />
  );
}
