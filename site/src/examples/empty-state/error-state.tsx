import { ErrorState } from "@senvenli/react/feedback";

export default function Example() {
  return (
    <ErrorState
      title="Orders could not be loaded"
      description="Check your connection and try again. Your filters are kept."
      errorCode="ORD-504"
      onRetry={() => new Promise((resolve) => setTimeout(resolve, 800))}
    />
  );
}
