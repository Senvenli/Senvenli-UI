import { Button } from "@senvenli/react/action";
import { EmptyState } from "@senvenli/react/feedback";
import { useState } from "react";

// A failed load: the danger tone, the message announced, the code for support, and a retry that shows it is busy.
export default function Example() {
  const [retrying, setRetrying] = useState(false);
  const retry = async () => {
    setRetrying(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
    } finally {
      setRetrying(false);
    }
  };
  return (
    <EmptyState
      tone="danger"
      icon="cloud-off"
      announce
      title="Orders could not be loaded"
      description="Check your connection and try again. Your filters are kept."
      details={
        <span className="font-ds-mono text-body-small text-ds-text-subtlest">
          Error code: <bdi>ORD-504</bdi>
        </span>
      }
      primaryAction={
        <Button iconBefore="rotate-cw" isPending={retrying} onPress={() => void retry()}>
          Retry
        </Button>
      }
    />
  );
}
