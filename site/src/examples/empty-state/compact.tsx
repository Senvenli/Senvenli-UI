import { EmptyState } from "@senvenli/react/feedback";
import { Box } from "@senvenli/react/layout";

export default function Example() {
  return (
    <Box radius="large" border>
      <EmptyState
        size="compact"
        icon="message-square"
        title="No comments yet"
        description="Comments from your team appear here."
      />
    </Box>
  );
}
