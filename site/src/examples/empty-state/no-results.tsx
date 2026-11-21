import { Button } from "@senvenli/react/action";
import { EmptyState } from "@senvenli/react/feedback";

export default function Example() {
  return (
    <EmptyState
      icon="search-x"
      title="No customers match “lovelace ltd”"
      description="Check the spelling, or clear the filters to see every customer."
      primaryAction={<Button>Clear filters</Button>}
    />
  );
}
